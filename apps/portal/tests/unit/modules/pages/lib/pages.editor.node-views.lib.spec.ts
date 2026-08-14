import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@company-brain/shared';
import { createPageEditorNodeViews } from '@/modules/pages/lib/pages.editor.node-views.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';

const buildMentionDocument = (spaceId: string, pageId: string, label: string) =>
  pageContentSchema.parse({
    content: [
      {
        content: [{ attrs: { label, pageId, spaceId }, type: 'mention' }],
        type: 'paragraph',
      },
    ],
    schemaVersion: 1,
    type: 'doc',
  });

const renderMentionLink = (content: ReturnType<typeof buildMentionDocument>): HTMLAnchorElement => {
  const document = pageEditorSchema.nodeFromJSON(content);
  const mentionNode = document.content.firstChild?.content.firstChild;
  if (mentionNode === undefined || mentionNode === null) throw new Error('mention node missing');

  const nodeViews = createPageEditorNodeViews({
    code: {
      copied: 'Copied',
      copy: 'Copy',
      diagram: {
        both: 'Both',
        code: 'Code',
        download: 'Download',
        drawing: 'Drawing',
        fullScreen: 'Full screen',
        line: 'line',
        unknown: 'no es un diagrama',
        formula: { both: 'código y fórmula', code: 'solo el código', drawing: 'solo la fórmula' },
      },
      language: 'Language',
      languages: { plain: 'No language' },
      wrap: 'Wrap',
    },
    embed: { providers: { youtube: 'YouTube' }, refused: 'Nothing to show:', resize: 'Resize' },
    file: { fullScreen: 'Full screen', resize: 'Resize the document' },
    collection: 'Collection',
    image: { caption: 'Describe the image', resize: 'Resize' },
    task: 'Task',
    media: {
      fullScreen: 'Full screen',
      mute: 'Mute',
      pause: 'Pause',
      play: 'Play',
      resize: 'Resize',
      seek: 'Position',
      unmute: 'Unmute',
    },
    toggle: { open: 'Toggle', title: 'Toggle title' },
    unsupported: 'Unsupported block',
  });
  const view = nodeViews.mention?.(mentionNode, {} as never, () => undefined);
  if (view === undefined) throw new Error('mention node view missing');

  return view.dom as HTMLAnchorElement;
};

describe('createPageEditorNodeViews mention', () => {
  it('renders a mention as a link to the target page within its own space', () => {
    const link = renderMentionLink(
      buildMentionDocument('33333333-3333-4333-8333-333333333333', 'target-page-id', 'Target Page'),
    );

    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/spaces/33333333-3333-4333-8333-333333333333/pages/target-page-id');
    expect(link.textContent).toBe('Target Page');
  });

  it('renders a mention to a page in a different space as a link to that target space', () => {
    const link = renderMentionLink(
      buildMentionDocument('44444444-4444-4444-8444-444444444444', 'target-page-id', 'Target Page'),
    );

    expect(link.getAttribute('href')).toBe('/spaces/44444444-4444-4444-8444-444444444444/pages/target-page-id');
  });
});

describe('createPageEditorNodeViews collection', () => {
  const nodeViews = createPageEditorNodeViews({
    code: {
      copied: 'Copied',
      copy: 'Copy',
      diagram: {
        both: 'Both',
        code: 'Code',
        download: 'Download',
        drawing: 'Drawing',
        fullScreen: 'Full screen',
        line: 'line',
        unknown: 'no es un diagrama',
        formula: { both: 'código y fórmula', code: 'solo el código', drawing: 'solo la fórmula' },
      },
      language: 'Language',
      languages: { plain: 'No language' },
      wrap: 'Wrap',
    },
    embed: { providers: { youtube: 'YouTube' }, refused: 'Nothing to show:', resize: 'Resize' },
    file: { fullScreen: 'Full screen', resize: 'Resize the document' },
    collection: 'Collection',
    image: { caption: 'Describe the image', resize: 'Resize' },
    task: 'Task',
    media: {
      fullScreen: 'Full screen',
      mute: 'Mute',
      pause: 'Pause',
      play: 'Play',
      resize: 'Resize',
      seek: 'Position',
      unmute: 'Unmute',
    },
    toggle: { open: 'Toggle', title: 'Toggle title' },
    unsupported: 'Unsupported block',
  });

  it('leaves a host in the content where the collection will be rendered', () => {
    const node = pageEditorSchema.nodes.collection.create({ pageId: 'page-1', spaceId: 'space-1' });

    const view = nodeViews.collection?.(node, {} as never, () => undefined);

    expect(view?.dom.getAttribute('data-page-collection')).toBe('page-1');
    expect(view?.dom.getAttribute('data-space-id')).toBe('space-1');
    expect((view?.dom as HTMLElement).contentEditable).toBe('false');
  });

  it('records which view the block points at', () => {
    const node = pageEditorSchema.nodes.collection.create({ pageId: 'page-1', spaceId: 'space-1', viewName: 'Board' });

    const view = nodeViews.collection?.(node, {} as never, () => undefined);

    expect(view?.dom.getAttribute('data-view-name')).toBe('Board');
  });
});
