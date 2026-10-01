import { describe, expect, it } from 'bun:test';
import type { PageLifecycle } from '@company-brain/shared';
import { pageContentSchema } from '@company-brain/shared';
import type { PageIcon } from '@/modules/pages/appearance/types/pages.icon.types';
import { createPageEditorNodeViews } from '@/modules/pages/editor/blocks/lib/pages.editor.node-views.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';

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

const renderMentionLink = (
  content: ReturnType<typeof buildMentionDocument>,
  readPageIcon: (pageId: string) => PageIcon | null = () => null,
  readPageLifecycle: (pageId: string) => PageLifecycle | null = () => null,
): HTMLAnchorElement => {
  const document = pageEditorSchema.nodeFromJSON(content);
  const mentionNode = document.content.firstChild?.content.firstChild;
  if (mentionNode === undefined || mentionNode === null) throw new Error('mention node missing');

  const nodeViews = createPageEditorNodeViews(
    {
      code: {
        copied: 'Copied',
        copy: 'Copy',
        diagram: {
          actualSize: 'Real size',
          both: 'Both',
          code: 'Code',
          download: 'Download',
          drawing: 'Drawing',
          fitToFrame: 'Fit to frame',
          frameHeight: 'Frame height',
          fullScreen: 'Full screen',
          line: 'line',
          unknown: 'no es un diagrama',
          zoomIn: 'Zoom in',
          zoomOut: 'Zoom out',
          formula: { both: 'código y fórmula', code: 'solo el código', drawing: 'solo la fórmula' },
        },
        language: 'Language',
        languages: { plain: 'No language' },
        wrap: 'Wrap',
      },
      date: { field: 'Which day', label: 'Date', locale: 'en' },
      embed: { providers: { youtube: 'YouTube' }, refused: 'Nothing to show:', resize: 'Resize' },
      file: { fullScreen: 'Full screen', resize: 'Resize the document' },
      formula: {
        done: 'Done',
        empty: 'Formula not written yet',
        field: 'The formula',
        help: 'Written in LaTeX.',
        inline: 'Formula',
        unreadable: 'This formula cannot be drawn, so it is shown exactly as it was written.',
      },
      collection: 'Collection',
      contents: { empty: 'sin encabezados', title: 'en esta página' },
      button: {
        deed: 'Qué hace',
        deeds: { blocks: 'Escribir', row: 'Fila' },
        name: 'Lo que dice',
        needsCollection: 'Elige la colección',
        place: 'Dónde',
        places: { below: 'Debajo', bottom: 'Al final', top: 'Al principio' },
        setup: 'Configurar',
      },
      subpage: { subpage: 'Subpágina', untitled: 'Sin título' },
      synced: { lost: 'ya no está', source: 'ver dónde vive', synced: 'Sincronizado' },
      image: { caption: 'Describe the image', resize: 'Resize' },
      mentionTrashed: { label: 'eliminada', tooltip: (name: string) => `${name} fue enviada a la papelera` },
      person: 'Person',
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
    },
    undefined,
    undefined,
    undefined,
    undefined,
    readPageIcon,
    readPageLifecycle,
  );
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

  it('wears the mark the mentioned page wears, instead of the plain page mark', () => {
    const link = renderMentionLink(
      buildMentionDocument('33333333-3333-4333-8333-333333333333', 'target-page-id', 'Target Page'),
      () => ({ kind: 'emoji', value: '🚀' }),
    );

    expect(link.textContent).toContain('🚀');
    expect(link.querySelector('svg')).toBeNull();
  });

  it('falls back to the plain page mark when the mentioned page is not at hand', () => {
    const link = renderMentionLink(
      buildMentionDocument('33333333-3333-4333-8333-333333333333', 'target-page-id', 'Target Page'),
    );

    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('says with words that a mentioned page was thrown away, not only with color', () => {
    const link = renderMentionLink(
      buildMentionDocument('33333333-3333-4333-8333-333333333333', 'target-page-id', 'Target Page'),
      () => null,
      () => 'TRASHED',
    );

    expect(link.textContent).toContain('eliminada');
    expect(link.title).toContain('Target Page');
    expect(link.title).toBe('Target Page fue enviada a la papelera');
  });

  it('draws a mention as usual when the mentioned page is still active', () => {
    const link = renderMentionLink(
      buildMentionDocument('33333333-3333-4333-8333-333333333333', 'target-page-id', 'Target Page'),
      () => null,
      () => 'ACTIVE',
    );

    expect(link.textContent).not.toContain('eliminada');
    expect(link.title).toBe('');
  });

  it('draws a mention as usual when the mentioned page is not at hand, instead of assuming it was thrown away', () => {
    const link = renderMentionLink(
      buildMentionDocument('33333333-3333-4333-8333-333333333333', 'target-page-id', 'Target Page'),
      () => null,
      () => null,
    );

    expect(link.textContent).not.toContain('eliminada');
    expect(link.title).toBe('');
  });
});

describe('createPageEditorNodeViews collection', () => {
  const nodeViews = createPageEditorNodeViews({
    code: {
      copied: 'Copied',
      copy: 'Copy',
      diagram: {
        actualSize: 'Real size',
        both: 'Both',
        code: 'Code',
        download: 'Download',
        drawing: 'Drawing',
        fitToFrame: 'Fit to frame',
        frameHeight: 'Frame height',
        fullScreen: 'Full screen',
        line: 'line',
        unknown: 'no es un diagrama',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        formula: { both: 'código y fórmula', code: 'solo el código', drawing: 'solo la fórmula' },
      },
      language: 'Language',
      languages: { plain: 'No language' },
      wrap: 'Wrap',
    },
    date: { field: 'Which day', label: 'Date', locale: 'en' },
    embed: { providers: { youtube: 'YouTube' }, refused: 'Nothing to show:', resize: 'Resize' },
    file: { fullScreen: 'Full screen', resize: 'Resize the document' },
    formula: {
      done: 'Done',
      empty: 'Formula not written yet',
      field: 'The formula',
      help: 'Written in LaTeX.',
      inline: 'Formula',
      unreadable: 'This formula cannot be drawn, so it is shown exactly as it was written.',
    },
    collection: 'Collection',
    contents: { empty: 'sin encabezados', title: 'en esta página' },
    button: {
      deed: 'Qué hace',
      deeds: { blocks: 'Escribir', row: 'Fila' },
      name: 'Lo que dice',
      needsCollection: 'Elige la colección',
      place: 'Dónde',
      places: { below: 'Debajo', bottom: 'Al final', top: 'Al principio' },
      setup: 'Configurar',
    },
    subpage: { subpage: 'Subpágina', untitled: 'Sin título' },
    synced: { lost: 'ya no está', source: 'ver dónde vive', synced: 'Sincronizado' },
    image: { caption: 'Describe the image', resize: 'Resize' },
    mentionTrashed: { label: 'eliminada', tooltip: (name: string) => `${name} fue enviada a la papelera` },
    person: 'Person',
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
    expect((view?.dom as HTMLElement | undefined)?.contentEditable).toBe('false');
  });

  it('records which view the block points at', () => {
    const node = pageEditorSchema.nodes.collection.create({ pageId: 'page-1', spaceId: 'space-1', viewName: 'Board' });

    const view = nodeViews.collection?.(node, {} as never, () => undefined);

    expect(view?.dom.getAttribute('data-view-name')).toBe('Board');
  });
});
