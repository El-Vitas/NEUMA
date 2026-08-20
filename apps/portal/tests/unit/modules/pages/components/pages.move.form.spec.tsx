import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import en from '../../../../../messages/en.json';

type ActionResult<T> = { data: T } | { serverError: string };

const movePage = mock(async () => ({ data: undefined }));
const getSpaceMoveAccessLoss = mock(async (): Promise<ActionResult<{ count: number }>> => ({ data: { count: 0 } }));
const useMoveDestinations = mock(() => ({
  pages: [{ id: 'page-b', spaceId: 'space-a', title: 'Notes' }],
  spaces: [
    { id: 'space-a', name: 'Alpha' },
    { id: 'space-b', name: 'Beta' },
  ],
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  movePageAction: movePage,
}));
mock.module('@/shared/server/actions/space-move-access.actions', () => ({
  getSpaceMoveAccessLossAction: getSpaceMoveAccessLoss,
}));
mock.module('@/modules/pages/hooks/use.pages.move.destinations', () => ({
  usePagesMoveDestinations: useMoveDestinations,
}));

const { PagesMoveForm } = await import('@/modules/pages/components/pages.move.form');

const page = { id: 'page-a', parentId: null, spaceId: 'space-a', title: 'Roadmap' } as Parameters<
  typeof PagesMoveForm
>[0]['page'];

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesMoveForm ariaLabelledBy="move-label" page={page} spaceId="space-a" />
    </NextIntlClientProvider>,
  );

const openAndSelectBetaRoot = async (): Promise<void> => {
  fireEvent.click(screen.getByRole('button', { name: /Space root/i }));
  const options = await screen.findAllByRole('option');
  fireEvent.click(options[options.length - 1] as HTMLElement);
};

describe('PagesMoveForm — moving across spaces', () => {
  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('moves right away when the destination is in the same space, without checking access', async () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Space root/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Notes' }));

    await waitFor(() => {
      expect(movePage).toHaveBeenCalledWith({
        pageId: 'page-a',
        parentId: 'page-b',
        spaceId: 'space-a',
        targetSpaceId: undefined,
      });
    });
    expect(getSpaceMoveAccessLoss).not.toHaveBeenCalled();
  });

  it('moves right away across spaces when nobody would lose access', async () => {
    renderForm();

    await openAndSelectBetaRoot();

    await waitFor(() => {
      expect(getSpaceMoveAccessLoss).toHaveBeenCalledWith({ sourceSpaceId: 'space-a', targetSpaceId: 'space-b' });
      expect(movePage).toHaveBeenCalledWith({
        pageId: 'page-a',
        parentId: null,
        spaceId: 'space-a',
        targetSpaceId: 'space-b',
      });
    });
    expect(screen.queryByText('Someone will stop seeing this page')).toBeNull();
  });

  it('asks for confirmation before moving somewhere people would lose access, and does not move yet', async () => {
    getSpaceMoveAccessLoss.mockImplementationOnce(async () => ({ data: { count: 2 } }));
    renderForm();

    await openAndSelectBetaRoot();

    expect(await screen.findByText('Someone will stop seeing this page')).toBeDefined();
    expect(movePage).not.toHaveBeenCalled();
  });

  it('moves once the warning is confirmed', async () => {
    getSpaceMoveAccessLoss.mockImplementationOnce(async () => ({ data: { count: 2 } }));
    renderForm();

    await openAndSelectBetaRoot();
    fireEvent.click(await screen.findByRole('button', { name: 'Move anyway' }));

    await waitFor(() => {
      expect(movePage).toHaveBeenCalledWith({
        pageId: 'page-a',
        parentId: null,
        spaceId: 'space-a',
        targetSpaceId: 'space-b',
      });
    });
  });

  it('cancels the warning without moving', async () => {
    getSpaceMoveAccessLoss.mockImplementationOnce(async () => ({ data: { count: 2 } }));
    renderForm();

    await openAndSelectBetaRoot();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Someone will stop seeing this page')).toBeNull();
    });
    expect(movePage).not.toHaveBeenCalled();
  });

  it('reports that the check failed, not that the move failed, when the access check itself fails', async () => {
    getSpaceMoveAccessLoss.mockImplementationOnce(async () => ({ serverError: 'unexpected' }));
    renderForm();

    await openAndSelectBetaRoot();

    await waitFor(() => {
      expect(screen.getByText('Could not check who would lose access, so the page was not moved.')).toBeDefined();
    });
    expect(movePage).not.toHaveBeenCalled();
  });
});
