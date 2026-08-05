import { describe, expect, it } from 'bun:test';
import { joinBackward, splitBlock } from 'prosemirror-commands';
import { EditorState, TextSelection } from 'prosemirror-state';
import { createPageEditorBlockIdPlugin, getPageEditorBlockId } from '@/modules/pages/lib/pages.editor.block-id.lib';
import { createPageAssetInsertCommand } from '@/modules/pages/lib/pages.editor.commands';
import { createEmptyPageContent } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';

const createStateWithPlugin = (content: Record<string, unknown>): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(content),
    plugins: [createPageEditorBlockIdPlugin()],
    schema: pageEditorSchema,
  });

const collectBlockIds = (state: EditorState): readonly (string | null)[] => {
  const blockIds: (string | null)[] = [];
  state.doc.descendants((node) => {
    if (!('id' in node.attrs)) return;
    blockIds.push(getPageEditorBlockId(node));
  });
  return blockIds;
};

describe('createPageEditorBlockIdPlugin typing', () => {
  it('keeps a paragraph id stable while typing inside it', () => {
    const state = createStateWithPlugin({
      content: [{ attrs: { id: 'block-1' }, content: [{ text: 'Hello', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });

    const insertPos = state.doc.content.size - 1;
    const nextState = state.apply(state.tr.insertText(' world', insertPos));

    expect(nextState.doc.textContent).toBe('Hello world');
    expect(getPageEditorBlockId(nextState.doc.child(0))).toBe('block-1');
  });
});

describe('createPageEditorBlockIdPlugin node creation', () => {
  it('assigns ids to every block once the document changes for the first time', () => {
    const state = createStateWithPlugin(createEmptyPageContent());
    const run = createPageAssetInsertCommand(pageEditorSchema, 'image', { assetId: 'asset-1' });

    let nextState = state;
    const dispatched = run(state, (transaction) => {
      nextState = state.apply(transaction);
    });

    expect(dispatched).toBe(true);
    const blockIds = collectBlockIds(nextState);
    expect(blockIds.every((blockId) => typeof blockId === 'string' && blockId.length > 0)).toBe(true);
    expect(new Set(blockIds).size).toBe(blockIds.length);
  });

  it('assigns ids at every depth of a nested list, not only at the top level', () => {
    const state = createStateWithPlugin({
      content: [
        {
          content: [
            {
              content: [
                { content: [{ text: 'Item one', type: 'text' }], type: 'paragraph' },
                {
                  content: [
                    {
                      content: [{ content: [{ text: 'Nested item', type: 'text' }], type: 'paragraph' }],
                      type: 'list_item',
                    },
                  ],
                  type: 'bullet_list',
                },
              ],
              type: 'list_item',
            },
          ],
          type: 'bullet_list',
        },
      ],
      type: 'doc',
    });

    const nextState = state.apply(state.tr.insertText('!', TextSelection.atEnd(state.doc).from));

    const blockIds: string[] = [];
    nextState.doc.descendants((node) => {
      if (!('id' in node.attrs)) return;
      const blockId = getPageEditorBlockId(node);
      expect(typeof blockId).toBe('string');
      if (blockId !== null) blockIds.push(blockId);
    });

    expect(blockIds.length).toBe(6);
    expect(new Set(blockIds).size).toBe(6);
  });
});

describe('createPageEditorBlockIdPlugin split', () => {
  it('leaves the original id on the first half and issues a new id to the second half', () => {
    const state = createStateWithPlugin({
      content: [{ attrs: { id: 'block-1' }, content: [{ text: 'Hello world', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });

    const splitPos = 1 + 'Hello'.length;
    const stateAtSplitPoint = state.apply(state.tr.setSelection(TextSelection.create(state.doc, splitPos)));

    let nextState = stateAtSplitPoint;
    const dispatched = splitBlock(stateAtSplitPoint, (transaction) => {
      nextState = stateAtSplitPoint.apply(transaction);
    });

    expect(dispatched).toBe(true);
    expect(nextState.doc.childCount).toBe(2);
    const [firstParagraph, secondParagraph] = [nextState.doc.child(0), nextState.doc.child(1)];
    expect(getPageEditorBlockId(firstParagraph)).toBe('block-1');
    expect(typeof getPageEditorBlockId(secondParagraph)).toBe('string');
    expect(getPageEditorBlockId(secondParagraph)).not.toBe('block-1');
  });
});

describe('createPageEditorBlockIdPlugin merge', () => {
  it('keeps the surviving block id when merging two paragraphs', () => {
    const doc = {
      content: [
        { attrs: { id: 'block-1' }, content: [{ text: 'Hello', type: 'text' }], type: 'paragraph' },
        { attrs: { id: 'block-2' }, content: [{ text: 'World', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    };
    const state = createStateWithPlugin(doc);
    const secondParagraphStart = state.doc.child(0).nodeSize + 1;
    const stateAtBoundary = state.apply(state.tr.setSelection(TextSelection.create(state.doc, secondParagraphStart)));

    let nextState = stateAtBoundary;
    const dispatched = joinBackward(stateAtBoundary, (transaction) => {
      nextState = stateAtBoundary.apply(transaction);
    });

    expect(dispatched).toBe(true);
    expect(nextState.doc.childCount).toBe(1);
    expect(nextState.doc.textContent).toBe('HelloWorld');
    expect(getPageEditorBlockId(nextState.doc.child(0))).toBe('block-1');
  });
});

describe('createPageEditorBlockIdPlugin paste within the same document', () => {
  it('re-issues an id for a pasted copy of an existing block so no two blocks share one', () => {
    const state = createStateWithPlugin({
      content: [{ attrs: { id: 'block-1' }, content: [{ text: 'Hello', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });

    const copiedParagraph = state.doc.child(0).copy(state.doc.child(0).content);
    const nextState = state.apply(state.tr.insert(state.doc.content.size, copiedParagraph));

    expect(nextState.doc.childCount).toBe(2);
    const blockIds = [getPageEditorBlockId(nextState.doc.child(0)), getPageEditorBlockId(nextState.doc.child(1))];
    expect(blockIds).toContain('block-1');
    expect(new Set(blockIds).size).toBe(2);
    expect(blockIds.every((blockId) => typeof blockId === 'string' && blockId.length > 0)).toBe(true);
  });
});
