import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { redo, undo } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import {
  createPageEditorBlockConversionCommand,
  listPageEditorBlockConversions,
} from '@/modules/pages/lib/pages.editor.convert.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const listItem = (text: string): PageContentNode => ({ content: [paragraph(text)], type: 'list_item' });

const asPageContent = (content: PageContentNode[]): PageContent => ({ content, schemaVersion: 1, type: 'doc' });

const createState = (content: PageContentNode[]): EditorState =>
  createPageEditorState(asPageContent(content), 'Select block');

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const findTextPosition = (state: EditorState, text: string): number => {
  let position: number | null = null;
  state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) position = nodePosition;
  });
  if (position === null) throw new Error(`text "${text}" not found`);
  return position;
};

const putCursorIn = (state: EditorState, text: string): EditorState =>
  state.apply(state.tr.setSelection(TextSelection.create(state.doc, findTextPosition(state, text) + 1)));

const selectFromTo = (state: EditorState, fromText: string, toText: string): EditorState =>
  state.apply(
    state.tr.setSelection(
      TextSelection.create(state.doc, findTextPosition(state, fromText), findTextPosition(state, toText) + 1),
    ),
  );

const selectBlockAt = (state: EditorState, blockIndex: number): EditorState => {
  let blockStart = 0;
  for (let index = 0; index < blockIndex; index += 1) blockStart += state.doc.child(index).nodeSize;
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, blockStart)));
};

const convert = (state: EditorState, targetId: string): EditorState =>
  applyCommand(state, createPageEditorBlockConversionCommand(targetId));

const describeBlocks = (state: EditorState): unknown =>
  state.doc.children.map((block) => ({ text: block.textContent, type: block.type.name }));

const offerIds = (state: EditorState): readonly string[] =>
  listPageEditorBlockConversions(state).map((offer) => offer.id);

const findOffer = (state: EditorState, targetId: string) =>
  listPageEditorBlockConversions(state).find((offer) => offer.id === targetId);

describe('converting one block into another type', () => {
  it('keeps the text of the block it converts', () => {
    const state = putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto');

    const converted = convert(state, 'heading2');

    expect(describeBlocks(converted)).toEqual([{ text: 'Presupuesto', type: 'heading' }]);
    expect(converted.doc.child(0).attrs.level).toBe(2);
  });

  it('converts a selected block, not only one with the cursor in it', () => {
    const state = selectBlockAt(createState([paragraph('Uno'), paragraph('Dos')]), 1);

    const converted = convert(state, 'callout');

    expect(describeBlocks(converted)).toEqual([
      { text: 'Uno', type: 'paragraph' },
      { text: 'Dos', type: 'callout' },
    ]);
  });
});

describe('converting between the everyday block types', () => {
  const roundTrips: readonly { readonly targetId: string; readonly type: string }[] = [
    { targetId: 'paragraph', type: 'paragraph' },
    { targetId: 'heading1', type: 'heading' },
    { targetId: 'blockquote', type: 'blockquote' },
    { targetId: 'bulletList', type: 'bullet_list' },
    { targetId: 'taskList', type: 'task_list' },
    { targetId: 'callout', type: 'callout' },
  ];

  it('reaches every type from a paragraph and comes back to a paragraph', () => {
    for (const { targetId, type } of roundTrips) {
      const state = putCursorIn(createState([paragraph('Texto')]), 'Texto');

      const converted = convert(state, targetId);
      expect(describeBlocks(converted)).toEqual([{ text: 'Texto', type }]);

      const returned = convert(putCursorIn(converted, 'Texto'), 'paragraph');
      expect(describeBlocks(returned)).toEqual([{ text: 'Texto', type: 'paragraph' }]);
    }
  });

  it('carries the text from one non-paragraph type to another', () => {
    const state = putCursorIn(createState([paragraph('Pendiente')]), 'Pendiente');
    const task = convert(state, 'taskList');

    const callout = convert(putCursorIn(task, 'Pendiente'), 'callout');

    expect(describeBlocks(callout)).toEqual([{ text: 'Pendiente', type: 'callout' }]);
  });
});

describe('converting a list', () => {
  it('produces one paragraph per point', () => {
    const state = createState([{ content: [listItem('Uno'), listItem('Dos'), listItem('Tres')], type: 'bullet_list' }]);

    const converted = convert(putCursorIn(state, 'Uno'), 'paragraph');

    expect(describeBlocks(converted)).toEqual([
      { text: 'Uno', type: 'paragraph' },
      { text: 'Dos', type: 'paragraph' },
      { text: 'Tres', type: 'paragraph' },
    ]);
  });

  it('keeps one point per item when it becomes another kind of list', () => {
    const state = createState([{ content: [listItem('Uno'), listItem('Dos')], type: 'bullet_list' }]);

    const converted = convert(putCursorIn(state, 'Uno'), 'taskList');

    expect(converted.doc.childCount).toBe(1);
    expect(converted.doc.child(0).type.name).toBe('task_list');
    expect(converted.doc.child(0).children.map((item) => item.textContent)).toEqual(['Uno', 'Dos']);
  });
});

describe('converting several blocks at once', () => {
  it('converts every block the selection covers', () => {
    const state = createState([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]);

    const converted = convert(selectFromTo(state, 'Uno', 'Dos'), 'heading3');

    expect(describeBlocks(converted)).toEqual([
      { text: 'Uno', type: 'heading' },
      { text: 'Dos', type: 'heading' },
      { text: 'Tres', type: 'paragraph' },
    ]);
  });

  it('gathers them into a single block when the target holds several lines', () => {
    const state = createState([paragraph('Uno'), paragraph('Dos')]);

    const converted = convert(selectFromTo(state, 'Uno', 'Dos'), 'bulletList');

    expect(converted.doc.childCount).toBe(1);
    expect(converted.doc.child(0).children.map((item) => item.textContent)).toEqual(['Uno', 'Dos']);
  });
});

describe('warning before a conversion that would lose content', () => {
  it('says nothing is lost when the text simply changes shape', () => {
    const state = putCursorIn(createState([paragraph('Texto')]), 'Texto');

    expect(findOffer(state, 'heading1')?.losesContent).toBe(false);
  });

  it('warns when a block the conversion cannot carry would be dropped', () => {
    const state = createState([
      { content: [paragraph('Destacado'), { attrs: { assetId: 'asset-1' }, type: 'image' }], type: 'callout' },
    ]);

    expect(findOffer(putCursorIn(state, 'Destacado'), 'paragraph')?.losesContent).toBe(true);
  });

  it('warns when the target cannot keep the formatting the text carries', () => {
    const state = createState([
      { content: [{ marks: [{ type: 'strong' }], text: 'Destacado', type: 'text' }], type: 'paragraph' },
    ]);

    expect(findOffer(putCursorIn(state, 'Destacado'), 'codeBlock')?.losesContent).toBe(true);
    expect(findOffer(putCursorIn(state, 'Destacado'), 'blockquote')?.losesContent).toBe(false);
  });

  it('warns when what hangs from the block would stop being nested', () => {
    const state = createState([
      {
        content: [paragraph('Padre'), { content: [paragraph('Hijo')], type: 'block_children' }],
        type: 'nested_block',
      },
    ]);

    expect(findOffer(selectBlockAt(state, 0), 'paragraph')?.losesContent).toBe(true);
  });
});

describe('not offering a conversion that cannot be applied', () => {
  it('offers nothing for a block with no text to carry', () => {
    const state = selectBlockAt(createState([{ attrs: { assetId: 'asset-1' }, type: 'image' }]), 0);

    expect(offerIds(state)).toEqual([]);
    expect(createPageEditorBlockConversionCommand('paragraph')(state)).toBe(false);
  });

  it('offers nothing for a table, whose shape is its content', () => {
    const state = selectBlockAt(
      createState([
        {
          content: [{ content: [{ content: [paragraph('Celda')], type: 'table_cell' }], type: 'table_row' }],
          type: 'table',
        },
      ]),
      0,
    );

    expect(offerIds(state)).toEqual([]);
  });

  it('reports failure instead of throwing for a target that does not exist', () => {
    const state = putCursorIn(createState([paragraph('Texto')]), 'Texto');

    expect(createPageEditorBlockConversionCommand('sonnet')(state)).toBe(false);
  });

  it('offers only what fits where the block lives', () => {
    const state = createState([
      {
        content: [{ content: [{ content: [paragraph('Celda')], type: 'table_cell' }], type: 'table_row' }],
        type: 'table',
      },
    ]);

    expect(offerIds(putCursorIn(state, 'Celda'))).toContain('heading1');
  });
});

describe('undoing a conversion', () => {
  it('brings the block back as it was, in one step', () => {
    const state = putCursorIn(createState([paragraph('Texto')]), 'Texto');
    const converted = convert(state, 'bulletList');

    const undone = applyCommand(converted, undo);

    expect(describeBlocks(undone)).toEqual([{ text: 'Texto', type: 'paragraph' }]);
    expect(describeBlocks(applyCommand(undone, redo))).toEqual([{ text: 'Texto', type: 'bullet_list' }]);
  });
});

describe('what stays selected after converting', () => {
  it('leaves the converted block selected, ready to be converted again', () => {
    const state = putCursorIn(createState([paragraph('Texto')]), 'Texto');

    const converted = convert(state, 'blockquote');

    expect(converted.selection instanceof NodeSelection).toBe(true);
    expect(converted.selection.$from.nodeAfter?.type.name).toBe('blockquote');
    expect(offerIds(converted)).toContain('paragraph');
  });
});
