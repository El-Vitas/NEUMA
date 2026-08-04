import { describe, expect, it, mock } from 'bun:test';
import { act, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { createRef } from 'react';
import en from '../../../../../messages/en.json';

const collaborationSession = { marker: 'collaboration-session' };

mock.module('@/modules/pages/hooks/use.pages.collaboration', () => ({
  usePagesCollaboration: () => ({ participants: [], session: collaborationSession, status: 'connected' }),
}));

const { createEmptyPageContent, createPageEditorState } = await import('@/modules/pages/lib/pages.editor.lib');
const { createPageAssetInsertCommand } = await import('@/modules/pages/lib/pages.editor.commands');
const { pageEditorSchema } = await import('@/modules/pages/lib/pages.editor.schema');
const { pageContentSchema } = await import('@company-brain/shared');

const collaborationMarkerContent = pageContentSchema.parse({
  content: [{ content: [{ text: 'from-collaboration-session', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

mock.module('@/modules/pages/lib/pages.collaboration.lib', () => ({
  createCollaborativePageEditorState: () => createPageEditorState(collaborationMarkerContent),
  getCollaborationStatusLabelKey: (status: string) => `collaboration.${status}`,
}));

const { PagesProseMirrorEditor } = await import('@/modules/pages/components/pages.prose-mirror.editor');

const renderEditor = (props: {
  readonly canEdit: boolean;
  readonly onContentChange: (content: unknown) => void;
  readonly pageId: string | null;
}) => {
  const ref = createRef<{ readonly runCommand: (command: (...args: never[]) => boolean) => boolean } | null>();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesProseMirrorEditor
        canEdit={props.canEdit}
        content={createEmptyPageContent()}
        onContentChange={props.onContentChange}
        pageId={props.pageId}
        ref={ref}
      />
    </NextIntlClientProvider>,
  );
  return ref;
};

describe('PagesProseMirrorEditor runCommand', () => {
  it('dispatches the insert command into the live view so the asset survives the next dispatch', () => {
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    const insertFirstImage = createPageAssetInsertCommand(pageEditorSchema, 'image', { assetId: 'asset-1' });
    const insertSecondFile = createPageAssetInsertCommand(pageEditorSchema, 'file', { assetId: 'asset-2' });

    act(() => {
      ref.current?.runCommand(insertFirstImage);
    });
    act(() => {
      ref.current?.runCommand(insertSecondFile);
    });

    const finalContent = contentUpdates.at(-1) as { readonly content: readonly { readonly type: string }[] };
    const nodeTypes = finalContent.content.map((node) => node.type);
    expect(nodeTypes).toContain('image');
    expect(nodeTypes).toContain('file');
    expect(nodeTypes.filter((type) => type === 'image' || type === 'file')).toHaveLength(2);
  });

  it('returns false and does not throw when the command rejects', () => {
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    const rejectingCommand = createPageAssetInsertCommand(pageEditorSchema, 'image', { assetId: '' });

    let dispatched: boolean | undefined;
    act(() => {
      dispatched = ref.current?.runCommand(rejectingCommand);
    });

    expect(dispatched).toBe(false);
    expect(contentUpdates).toHaveLength(0);
  });

  it('dispatches into the collaboration-bound state once a session is active, without remounting', () => {
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: '22222222-2222-4222-8222-222222222222',
    });

    const insertImage = createPageAssetInsertCommand(pageEditorSchema, 'image', { assetId: 'collab-asset' });
    let dispatched: boolean | undefined;
    act(() => {
      dispatched = ref.current?.runCommand(insertImage);
    });

    expect(dispatched).toBe(true);
    const finalContent = contentUpdates.at(-1) as {
      readonly content: readonly { readonly content?: readonly { readonly text?: string }[]; readonly type: string }[];
    };
    expect(finalContent.content.map((node) => node.type)).toEqual(['image', 'paragraph']);
    expect(finalContent.content[1]?.content?.[0]?.text).toBe('from-collaboration-session');
  });
});
