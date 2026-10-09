import { describe, expect, it, mock } from 'bun:test';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { createRef } from 'react';
import en from '../../../../../messages/en.json';

const collaborationSession = { fragment: null, marker: 'collaboration-session', provider: { awareness: null } };

mock.module('server-only', () => ({}));

mock.module('@/modules/pages/hooks/use.pages.collaboration', () => ({
  usePagesCollaboration: () => ({ participants: [], session: collaborationSession, status: 'connected' }),
}));

const mentionCandidates: { id: string; label: string; spaceId: string }[] = [];

mock.module('@/modules/pages/hooks/use.pages.mention-search', () => ({
  usePagesMentionSearch: (query: string | null) => ({
    candidates: query === null ? [] : mentionCandidates,
    isLoading: false,
  }),
}));

const insertTextCommand =
  (text: string): Command =>
  (state, dispatch) => {
    if (dispatch) dispatch(state.tr.insertText(text));
    return true;
  };

mock.module('@/modules/pages/attachments/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ data: undefined }),
  downloadPageAttachmentAction: async () => ({ serverError: 'request' }),
  uploadPageAttachmentAction: async () => ({
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      mimeType: 'image/png',
      originalFilename: 'diagram.png',
      size: 1024,
      uploadedBy: 'Jane Doe',
    },
  }),
}));

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  createPageCollectionAction: async () => ({ data: { id: 'page-3', title: 'Colección' } }),
  readPageCollectionAction: async () => ({ data: null }),
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  addBlocksToPageAction: async () => ({ data: undefined }),
  createPageAction: async () => ({ data: { id: 'page-2', title: 'Nueva' } }),
  listPageDestinationsAction: async () => ({ data: [] }),
}));

mock.module('@/modules/pages/links/server/actions/pages.person.actions', () => ({
  searchPagePersonCandidatesAction: async () => ({ data: [] }),
}));

mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ push: () => undefined }),
}));

const { createEmptyPageContent, createPageEditorState } = await import('@/modules/pages/editor/lib/pages.editor.lib');
const { createPageAssetInsertCommand } = await import('@/modules/pages/editor/lib/pages.editor.commands');
const { pageEditorSchema } = await import('@/modules/pages/editor/lib/pages.editor.schema');
const { pageContentSchema } = await import('@neuma/shared');

const collaborationMarkerContent = pageContentSchema.parse({
  content: [{ content: [{ text: 'from-collaboration-session', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

mock.module('@/modules/pages/lib/pages.collaboration.lib', () => ({
  createCollaborativePageEditorState: () => createPageEditorState(collaborationMarkerContent, 'Select block'),
  getCollaborationStatusLabelKey: (status: string) => `collaboration.${status}`,
  keepClicksAcrossChangesFromOthers: () => () => undefined,
  readWhereThisPersonWrites: (view: EditorView) => ({
    anchor: view.state.selection.anchor,
    head: view.state.selection.head,
  }),
  restoreSelectionIfStillWriting: () => undefined,
}));

const { PagesProseMirrorEditor } = await import('@/modules/pages/components/pages.prose-mirror.editor');

const renderEditor = (props: {
  readonly canEdit: boolean;
  readonly onContentChange: (content: unknown) => void;
  readonly pageId: string | null;
}) => {
  const ref = createRef<{
    readonly goToHeading: (position: number) => void;
    readonly goToWriting: () => void;
    readonly runCommand: (command: (...args: never[]) => boolean) => boolean;
  } | null>();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesProseMirrorEditor
        canEdit={props.canEdit}
        content={createEmptyPageContent()}
        onContentChange={props.onContentChange}
        pageId={props.pageId}
        ref={ref}
        spaceId="space-1"
      />
    </NextIntlClientProvider>,
  );
  return ref;
};

describe('PagesProseMirrorEditor runCommand', () => {
  it('uploads a file selected from the editor toolbar and reports the persisted attachment', async () => {
    const uploadedAttachments: unknown[] = [];
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          canEdit
          content={createEmptyPageContent()}
          onAttachmentUploaded={(attachment) => uploadedAttachments.push(attachment)}
          onContentChange={() => undefined}
          pageId="22222222-2222-4222-8222-222222222222"
          spaceId="space-1"
        />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Choose a file', { selector: 'input' }), {
      target: { files: [new File(['image'], 'diagram.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(uploadedAttachments).toHaveLength(1));
    expect(uploadedAttachments[0]).toMatchObject({ originalFilename: 'diagram.png' });
  });

  it('uploads a file dropped on the editor surface and reports the persisted attachment', async () => {
    const uploadedAttachments: unknown[] = [];
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          canEdit
          content={createEmptyPageContent()}
          onAttachmentUploaded={(attachment) => uploadedAttachments.push(attachment)}
          onContentChange={() => undefined}
          pageId="22222222-2222-4222-8222-222222222222"
          spaceId="space-1"
        />
      </NextIntlClientProvider>,
    );
    const editorSurface = container.querySelector('.ProseMirror');
    const droppedFile = new File(['image'], 'diagram.png', { type: 'image/png' });

    expect(editorSurface).not.toBeNull();
    if (editorSurface === null) return;
    fireEvent.drop(editorSurface, {
      dataTransfer: {
        files: [droppedFile],
      },
    });

    await waitFor(() => expect(uploadedAttachments).toHaveLength(1));
    expect(uploadedAttachments[0]).toMatchObject({ originalFilename: 'diagram.png' });
  });

  it('ignores a second file drop while the first upload is pending', async () => {
    const uploadedAttachments: unknown[] = [];
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          canEdit
          content={createEmptyPageContent()}
          onAttachmentUploaded={(attachment) => uploadedAttachments.push(attachment)}
          onContentChange={() => undefined}
          pageId="22222222-2222-4222-8222-222222222222"
          spaceId="space-1"
        />
      </NextIntlClientProvider>,
    );
    const editorSurface = container.querySelector('.ProseMirror');
    const droppedFile = new File(['image'], 'diagram.png', { type: 'image/png' });

    expect(editorSurface).not.toBeNull();
    if (editorSurface === null) return;

    fireEvent.drop(editorSurface, { dataTransfer: { files: [droppedFile] } });
    fireEvent.drop(editorSurface, { dataTransfer: { files: [droppedFile] } });

    await waitFor(() => expect(uploadedAttachments).toHaveLength(1));
  });

  it('prevents the browser default when a file is dropped on a read-only editor', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          canEdit={false}
          content={createEmptyPageContent()}
          onContentChange={() => undefined}
          pageId="22222222-2222-4222-8222-222222222222"
          spaceId="space-1"
        />
      </NextIntlClientProvider>,
    );
    const editorSurface = container.querySelector('.ProseMirror');

    expect(editorSurface).not.toBeNull();
    if (editorSurface === null) return;

    const wasNotCancelled = fireEvent.drop(editorSurface, {
      dataTransfer: {
        files: [new File(['image'], 'diagram.png', { type: 'image/png' })],
      },
    });

    expect(wasNotCancelled).toBe(false);
  });

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

describe('PagesProseMirrorEditor mention picker', () => {
  it('inserts the selected page as a mention and removes the trigger text', () => {
    mentionCandidates.length = 0;
    mentionCandidates.push({ id: 'target-page-id', label: 'Target Page', spaceId: 'target-space-id' });
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    act(() => {
      ref.current?.runCommand(insertTextCommand('@Tar'));
    });

    const option = screen.getByRole('option', { name: 'Target Page' });
    fireEvent.mouseDown(option);

    expect(screen.queryByRole('listbox')).toBeNull();
    const finalContent = contentUpdates.at(-1) as {
      readonly content: readonly {
        readonly content?: readonly { readonly attrs?: unknown; readonly text?: string; readonly type: string }[];
      }[];
    };
    const paragraphNodes = finalContent.content[0]?.content ?? [];
    expect(paragraphNodes).toContainEqual({
      attrs: { label: 'Target Page', pageId: 'target-page-id', spaceId: 'target-space-id' },
      type: 'mention',
    });
    expect(paragraphNodes.some((node) => node.text?.includes('@Tar'))).toBe(false);
  });

  it('opens the mention menu for an @ typed after a space mid-sentence and inserts the mention inline', () => {
    mentionCandidates.length = 0;
    mentionCandidates.push({ id: 'target-page-id', label: 'Target Page', spaceId: 'target-space-id' });
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    act(() => {
      ref.current?.runCommand(insertTextCommand('See @Tar'));
    });

    const option = screen.getByRole('option', { name: 'Target Page' });
    fireEvent.mouseDown(option);

    expect(screen.queryByRole('listbox')).toBeNull();
    const finalContent = contentUpdates.at(-1) as {
      readonly content: readonly {
        readonly content?: readonly { readonly attrs?: unknown; readonly text?: string; readonly type: string }[];
      }[];
    };
    const paragraphNodes = finalContent.content[0]?.content ?? [];
    expect(paragraphNodes).toContainEqual({
      attrs: { label: 'Target Page', pageId: 'target-page-id', spaceId: 'target-space-id' },
      type: 'mention',
    });
    expect(paragraphNodes.some((node) => node.text === 'See ')).toBe(true);
  });

  it('closes the mention picker on Escape without inserting anything', () => {
    mentionCandidates.length = 0;
    mentionCandidates.push({ id: 'target-page-id', label: 'Target Page', spaceId: 'target-space-id' });
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    act(() => {
      ref.current?.runCommand(insertTextCommand('@Tar'));
    });
    expect(screen.getByRole('option', { name: 'Target Page' })).toBeDefined();

    const editorHost = document.querySelector('.ProseMirror');
    expect(editorHost).not.toBeNull();
    if (editorHost === null) return;
    fireEvent.keyDown(editorHost, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    const finalContent = contentUpdates.at(-1) as {
      readonly content: readonly {
        readonly content?: readonly { readonly attrs?: unknown; readonly text?: string; readonly type: string }[];
      }[];
    };
    const paragraphNodes = finalContent.content[0]?.content ?? [];
    expect(paragraphNodes.some((node) => node.type === 'mention')).toBe(false);
    expect(paragraphNodes.some((node) => node.text?.startsWith('@Tar'))).toBe(true);
  });
});

describe('PagesProseMirrorEditor trigger safety', () => {
  it('lets Enter insert a new line for prose whose slash is glued to a word, like a path', () => {
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    act(() => {
      ref.current?.runCommand(insertTextCommand('Some text src/lib'));
    });
    expect(screen.queryByRole('listbox')).toBeNull();

    const editorHost = document.querySelector('.ProseMirror');
    expect(editorHost).not.toBeNull();
    if (editorHost === null) return;
    fireEvent.keyDown(editorHost, { key: 'Enter' });

    const finalContent = contentUpdates.at(-1) as { readonly content: readonly { readonly type: string }[] };
    expect(finalContent.content.map((node) => node.type)).toEqual(['paragraph', 'paragraph']);
  });

  it('lets Enter insert a new line for prose that merely contains an email address', () => {
    mentionCandidates.length = 0;
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    act(() => {
      ref.current?.runCommand(insertTextCommand('Contact me at john@example.com'));
    });
    expect(screen.queryByRole('listbox')).toBeNull();

    const editorHost = document.querySelector('.ProseMirror');
    expect(editorHost).not.toBeNull();
    if (editorHost === null) return;
    fireEvent.keyDown(editorHost, { key: 'Enter' });

    const finalContent = contentUpdates.at(-1) as { readonly content: readonly { readonly type: string }[] };
    expect(finalContent.content.map((node) => node.type)).toEqual(['paragraph', 'paragraph']);
  });

  it('closes the trigger menu as soon as a space ends the query', () => {
    const contentUpdates: unknown[] = [];
    const ref = renderEditor({
      canEdit: true,
      onContentChange: (content) => contentUpdates.push(content),
      pageId: null,
    });

    act(() => {
      ref.current?.runCommand(insertTextCommand('/head'));
    });
    expect(screen.getByRole('listbox')).toBeDefined();

    act(() => {
      ref.current?.runCommand(insertTextCommand(' '));
    });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('PagesProseMirrorEditor block menu', () => {
  const openBlockMenu = (): void => {
    renderEditor({ canEdit: true, onContentChange: () => undefined, pageId: 'page-1' });
    const editor = document.querySelector('.ProseMirror');
    if (editor === null) throw new Error('editor not rendered');

    fireEvent.keyDown(editor, { ctrlKey: true, key: '/', keyCode: 191 });
  };

  it('opens what has been said about the block when its menu asks for the comments', async () => {
    openBlockMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Comment' }));

    await waitFor(() => expect(screen.getByText('Block comments')).toBeDefined());
  });

  it('opens where the block is going when its menu asks to move it', async () => {
    openBlockMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Move to…' }));

    await waitFor(() => expect(screen.getByText('Move the blocks to another page')).toBeDefined());
  });
});

describe('PagesProseMirrorEditor content notifications', () => {
  it('does not report a content change when only the pointer moves over a block', async () => {
    const reportedChanges: unknown[] = [];
    renderEditor({ canEdit: true, onContentChange: (content) => reportedChanges.push(content), pageId: 'page-1' });
    const editor = document.querySelector('.ProseMirror');
    if (editor === null) throw new Error('editor not rendered');
    const changesAfterMount = reportedChanges.length;

    for (const block of Array.from(editor.children)) {
      block.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }
    await Promise.resolve();

    expect(reportedChanges.length).toBe(changesAfterMount);
  });
});
