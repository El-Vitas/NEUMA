import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';

const batchMovePages = mock(async () => ({ data: { moved: 2, skipped: 0 } }));
const useMoveDestinations = mock((_isOpen: boolean, _pageId: string, _spaceId: string, _query: string) => ({
  pages: [{ id: 'page-b', spaceId: 'space-a', title: 'Notes' }],
  parentTitle: null as string | null,
  spaces: [{ id: 'space-a', name: 'Alpha' }],
}));

mock.module('@/modules/pages/navigation/hooks/use.pages.move.destinations', () => ({
  usePagesMoveDestinations: useMoveDestinations,
}));
mock.module('@/modules/portal/server/actions/portal.sidebar.selection.actions', () => ({
  batchMovePagesAction: batchMovePages,
}));

const { SidebarPageBatchMoveDialog } = await import(
  '@/shared/components/portal/sidebar/sidebar-page-batch-move-dialog'
);

const renderDialog = (onMoved = mock(() => undefined)) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarPageBatchMoveDialog
        anchorPageId="page-1"
        onClose={() => undefined}
        onMoved={onMoved}
        open
        pageIds={['page-1', 'page-2']}
        spaceId="space-a"
      />
    </NextIntlClientProvider>,
  );

describe('SidebarPageBatchMoveDialog', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('asks for what is typed and keeps whatever the server found', async () => {
    renderDialog();

    fireEvent.change(screen.getByPlaceholderText(en.pages.moveSearch), { target: { value: 'zzz' } });

    await waitFor(() => {
      expect(useMoveDestinations).toHaveBeenLastCalledWith(true, 'page-1', 'space-a', 'zzz');
    });
    expect(screen.getByRole('option', { name: 'Notes' })).toBeDefined();
  });

  it('moves every selected page to the destination chosen', async () => {
    const onMoved = mock(() => undefined);
    renderDialog(onMoved);

    fireEvent.click(screen.getByRole('option', { name: 'Notes' }));

    await waitFor(() => {
      expect(batchMovePages).toHaveBeenCalledWith({
        pageIds: ['page-1', 'page-2'],
        parentId: 'page-b',
        spaceId: 'space-a',
        targetSpaceId: undefined,
      });
    });
    await waitFor(() => {
      expect(onMoved).toHaveBeenCalledTimes(1);
    });
  });
});
