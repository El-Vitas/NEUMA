import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@neuma/shared';
import type { Command } from 'prosemirror-state';
import { EditorState } from 'prosemirror-state';
import { DEFAULT_PAGE_TOGGLE_SUMMARY } from '@/modules/pages/editor/constants/pages.editor.constants';
import {
  createPageAssetInsertCommand,
  createPageEditorCommands,
  createPageEmbedInsertCommand,
  createPageMentionInsertCommand,
} from '@/modules/pages/editor/lib/pages.editor.commands';
import { createEmptyPageContent, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';

const createEditorState = (): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(pageContentSchema.parse(createEmptyPageContent())),
    schema: pageEditorSchema,
  });

const runCommand = (state: EditorState, run: Command): EditorState => {
  let nextState = state;
  const dispatched = run(state, (transaction) => {
    nextState = state.apply(transaction);
  });
  expect(dispatched).toBe(true);
  return nextState;
};

const rejectsWithoutDispatching = (state: EditorState, run: Command): boolean =>
  run(state, () => {
    throw new Error('command must not dispatch when rejecting');
  });

describe('createPageEditorCommands', () => {
  it('inserts a minimal valid table that round-trips through the shared contract', () => {
    const commands = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
    const table = commands.table;
    if (table === undefined) throw new Error('table command missing');

    const content = serializePageEditorState(runCommand(createEditorState(), table.run));
    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({ type: 'table' });
  });

  it('draws a line and leaves a place to go on writing under it', () => {
    const commands = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
    const divider = commands.divider;
    if (divider === undefined) throw new Error('divider command missing');

    const content = serializePageEditorState(runCommand(createEditorState(), divider.run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({ type: 'divider' });
    expect(content.content[1]).toMatchObject({ type: 'paragraph' });
  });

  it('inserts a toggle with a non-empty summary that round-trips through the shared contract', () => {
    const commands = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
    const toggle = commands.toggle;
    if (toggle === undefined) throw new Error('toggle command missing');

    const content = serializePageEditorState(runCommand(createEditorState(), toggle.run));
    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({ attrs: { summary: 'Toggle' }, type: 'toggle' });
  });
});

describe('createPageAssetInsertCommand', () => {
  it('inserts an image node built from an asset id and round-trips it', () => {
    const run = createPageAssetInsertCommand(pageEditorSchema, 'image', { alt: 'Preview', assetId: 'asset-1' });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toEqual({ attrs: { alt: 'Preview', assetId: 'asset-1' }, type: 'image' });
  });

  it('inserts a file node built from an asset id and a caption', () => {
    const run = createPageAssetInsertCommand(pageEditorSchema, 'file', { assetId: 'asset-2', caption: 'Report' });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toEqual({ attrs: { assetId: 'asset-2', caption: 'Report' }, type: 'file' });
  });

  it('rejects an empty asset id without dispatching', () => {
    const run = createPageAssetInsertCommand(pageEditorSchema, 'image', { assetId: '' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects an asset id over the shared contract length limit without dispatching', () => {
    const run = createPageAssetInsertCommand(pageEditorSchema, 'image', { assetId: 'a'.repeat(201) });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects a caption over the shared contract length limit without dispatching', () => {
    const run = createPageAssetInsertCommand(pageEditorSchema, 'file', {
      assetId: 'asset-1',
      caption: 'a'.repeat(501),
    });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});

describe('createPageEmbedInsertCommand', () => {
  it('inserts an embed node for an allowlisted provider and url', () => {
    const run = createPageEmbedInsertCommand(pageEditorSchema, 'youtube', 'https://www.youtube.com/watch?v=abc123');
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toEqual({
      attrs: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' },
      type: 'embed',
    });
  });

  it('rejects a disallowed url without dispatching', () => {
    const run = createPageEmbedInsertCommand(pageEditorSchema, 'youtube', 'https://evil.example/video');

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects an otherwise allowlisted url over the shared contract length limit without dispatching', () => {
    const oversizedUrl = `https://www.youtube.com/watch?v=${'a'.repeat(2048)}`;
    const run = createPageEmbedInsertCommand(pageEditorSchema, 'youtube', oversizedUrl);

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});

describe('createPageMentionInsertCommand', () => {
  it('inserts a mention node built from a page id, label and space id and round-trips it', () => {
    const run = createPageMentionInsertCommand(pageEditorSchema, {
      label: 'Target Page',
      pageId: 'page-1',
      spaceId: 'space-1',
    });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({
      content: [{ attrs: { label: 'Target Page', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' }],
      type: 'paragraph',
    });
  });

  it('rejects an empty label without dispatching', () => {
    const run = createPageMentionInsertCommand(pageEditorSchema, { label: '', pageId: 'page-1', spaceId: 'space-1' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects a page id over the shared contract length limit without dispatching', () => {
    const run = createPageMentionInsertCommand(pageEditorSchema, {
      label: 'Target',
      pageId: 'a'.repeat(201),
      spaceId: 'space-1',
    });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects a missing space id without dispatching', () => {
    const run = createPageMentionInsertCommand(pageEditorSchema, { label: 'Target', pageId: 'page-1', spaceId: '' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});
