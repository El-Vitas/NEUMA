import { describe, expect, it, mock } from 'bun:test';
import { act, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { type Command, TextSelection } from 'prosemirror-state';
import { createRef } from 'react';
import en from '../../../../../messages/en.json';

mock.module('server-only', () => ({}));

mock.module('@/modules/pages/hooks/use.pages.mention-search', () => ({
  usePagesMentionSearch: () => ({ candidates: [], isLoading: false }),
}));

mock.module('@/modules/pages/attachments/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ data: undefined }),
  downloadPageAttachmentAction: async () => ({ serverError: 'request' }),
  uploadPageAttachmentAction: async () => ({ serverError: 'request' }),
}));

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  createPageCollectionAction: async () => ({ data: { id: 'page-3', title: 'Colección' } }),
  readPageCollectionAction: async () => ({ data: null }),
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  addBlocksToPageAction: async () => ({ data: undefined }),
  createPageAction: async () => ({ data: { id: 'page-2', title: 'Nueva' } }),
  listPageDestinationsAction: async () => ({ data: [] }),
  setPageLockAction: async () => ({ data: undefined }),
}));

mock.module('@/modules/pages/links/server/actions/pages.person.actions', () => ({
  searchPagePersonCandidatesAction: async () => ({ data: [] }),
}));

mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  unstable_rethrow: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ push: () => undefined }),
}));

const { createEmptyPageContent } = await import('@/modules/pages/editor/lib/pages.editor.lib');
const { PagesProseMirrorEditor } = await import('@/modules/pages/components/pages.prose-mirror.editor');

const PAGE_ID = '22222222-2222-4222-8222-222222222222';

type Handle = {
  readonly goToHeading: (position: number) => void;
  readonly goToWriting: () => void;
  readonly runCommand: (command: Command) => boolean;
};

describe('PagesProseMirrorEditor on the block channel', () => {
  it('shows the status and the people of the block channel', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          blockCollaboration={{
            participants: [{ clientId: 7, color: '#2563eb', cursor: { blockId: null }, name: 'Ana' }],
            status: 'reconnecting',
          }}
          canEdit
          content={createEmptyPageContent()}
          onContentChange={() => undefined}
          pageId={PAGE_ID}
          spaceId="space-1"
        />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Reconnecting'));
    expect(screen.getByText('Ana')).not.toBeNull();
  });

  it('keeps what was typed when the page turns read-only', () => {
    const ref = createRef<Handle>();
    const editor = (canEdit: boolean) => (
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          blockCollaboration={{ participants: [], status: 'connected' }}
          canEdit={canEdit}
          content={createEmptyPageContent()}
          onContentChange={() => undefined}
          pageId={PAGE_ID}
          ref={ref}
          spaceId="space-1"
        />
      </NextIntlClientProvider>
    );
    const { container, rerender } = render(editor(true));
    act(() => {
      ref.current?.runCommand((state, dispatch) => {
        dispatch?.(state.tr.insertText('typed words'));
        return true;
      });
    });

    rerender(editor(false));

    expect(container.querySelector('.ProseMirror')?.textContent).toContain('typed words');
  });

  it('tells where the cursor went each time the selection changes', async () => {
    const selections: number[] = [];
    const ref = createRef<Handle>();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesProseMirrorEditor
          blockCollaboration={{ participants: [], status: 'connected' }}
          canEdit
          content={createEmptyPageContent()}
          onContentChange={() => undefined}
          onSelectionChange={(selection) => selections.push(selection.from)}
          pageId={PAGE_ID}
          ref={ref}
          spaceId="space-1"
        />
      </NextIntlClientProvider>,
    );

    act(() => {
      ref.current?.runCommand((state, dispatch) => {
        dispatch?.(state.tr.insertText('abc'));
        return true;
      });
    });
    act(() => {
      ref.current?.runCommand((state, dispatch) => {
        dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, 1)));
        return true;
      });
    });

    expect(selections.at(-1)).toBe(1);
  });
});
