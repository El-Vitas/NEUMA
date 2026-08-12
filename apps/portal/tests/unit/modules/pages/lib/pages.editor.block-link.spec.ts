import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import type { EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import {
  buildPageEditorBlockLink,
  findPageEditorBlockElement,
  readPageEditorBlockId,
  readPageEditorBlockLinkTarget,
  revealPageEditorBlock,
} from '@/modules/pages/lib/pages.editor.block-link.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (text: string, id?: string): PageContentNode => ({
  attrs: id === undefined ? {} : { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const createState = (content: PageContentNode[]): EditorState =>
  createPageEditorState({ content, schemaVersion: 1, type: 'doc' } as PageContent, 'Select block');

const putCursorIn = (state: EditorState, text: string): EditorState => {
  let position: number | null = null;
  state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) position = nodePosition;
  });
  if (position === null) throw new Error(`text "${text}" not found`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, position + 1)));
};

describe('pointing at a block', () => {
  it('reads the identity of the block the cursor is in', () => {
    const state = putCursorIn(createState([paragraph('Uno', 'block-1'), paragraph('Dos', 'block-2')]), 'Dos');

    expect(readPageEditorBlockId(state)).toBe('block-2');
  });

  it('builds the address of the block on the page it lives on', () => {
    expect(buildPageEditorBlockLink('https://brain.test/es/pages/7', 'block-2')).toBe(
      'https://brain.test/es/pages/7#block-2',
    );
  });

  it('replaces the block a previous address pointed at, instead of piling them up', () => {
    expect(buildPageEditorBlockLink('https://brain.test/es/pages/7#block-1', 'block-2')).toBe(
      'https://brain.test/es/pages/7#block-2',
    );
  });

  it('reads which block an address is asking for', () => {
    expect(readPageEditorBlockLinkTarget('https://brain.test/es/pages/7#block-2')).toBe('block-2');
    expect(readPageEditorBlockLinkTarget('https://brain.test/es/pages/7')).toBeNull();
    expect(readPageEditorBlockLinkTarget('https://brain.test/es/pages/7#')).toBeNull();
  });

  it('marks the block it arrives at, and knows how to unmark it', () => {
    const page = document.createElement('div');
    page.innerHTML = '<p data-block-id="block-1">Uno</p>';
    const block = findPageEditorBlockElement(page, 'block-1');
    if (block === null) throw new Error('the block is not there');
    block.scrollIntoView = () => undefined;

    const unmark = revealPageEditorBlock(block);
    expect(block.className).toContain('ring-primary');

    unmark();
    expect(block.className).not.toContain('ring-primary');
  });

  it('finds the block on the page, and says so when it is no longer there', () => {
    const page = document.createElement('div');
    page.innerHTML = '<p data-block-id="block-1">Uno</p><p data-block-id="block-2">Dos</p>';

    expect(findPageEditorBlockElement(page, 'block-2')?.textContent).toBe('Dos');
    expect(findPageEditorBlockElement(page, 'block-9')).toBeNull();
  });
});
