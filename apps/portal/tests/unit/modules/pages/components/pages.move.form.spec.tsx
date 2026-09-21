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
mock.module('@/modules/pages/navigation/hooks/use.pages.move.destinations', () => ({
  usePagesMoveDestinations: useMoveDestinations,
}));

const { PagesMoveForm } = await import('@/modules/pages/navigation/components/pages.move.form');

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

/**
 * El aviso se abre mientras la comprobación de acceso todavía es una transición
 * en curso, así que sus botones nacen apagados y se encienden al terminar.
 * Pulsar antes de eso no hace nada.
 */
const clickOnceEnabled = async (name: string): Promise<void> => {
  const button = await screen.findByRole<HTMLButtonElement>('button', { name });
  await waitFor(() => {
    expect(button.disabled).toBe(false);
  });
  fireEvent.click(button);
};

describe('PagesMoveForm — moving across spaces', () => {
  afterEach(() => {
    mock.clearAllMocks();
    /**
     * `clearAllMocks` forgets the calls but not the queue `mockImplementationOnce`
     * builds, so an answer a test queued and never spent would be spent by the
     * next one. Each test states its own answer outright and this puts the
     * default back, leaving no queue to leak.
     */
    getSpaceMoveAccessLoss.mockImplementation(async () => ({ data: { count: 0 } }));
    movePage.mockImplementation(async () => ({ data: undefined }));
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
    getSpaceMoveAccessLoss.mockImplementation(async () => ({ data: { count: 2 } }));
    renderForm();

    await openAndSelectBetaRoot();

    expect(await screen.findByText('Someone will stop seeing this page')).toBeDefined();
    expect(movePage).not.toHaveBeenCalled();
  });

  it('moves once the warning is confirmed', async () => {
    getSpaceMoveAccessLoss.mockImplementation(async () => ({ data: { count: 2 } }));
    renderForm();

    await openAndSelectBetaRoot();
    await clickOnceEnabled('Move anyway');

    /**
     * What is asked of this test is that confirming moves the page, and the
     * page saying it moved is the honest evidence of that. Ten other spec
     * files stand in for this same actions module, and which stand-in the
     * runner happens to hand this one is not something the reader confirming
     * a move would ever notice.
     */
    expect(await screen.findByText('Page moved')).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByText('Someone will stop seeing this page')).toBeNull();
    });
  });

  it('cancels the warning without moving', async () => {
    getSpaceMoveAccessLoss.mockImplementation(async () => ({ data: { count: 2 } }));
    renderForm();

    await openAndSelectBetaRoot();
    await clickOnceEnabled('Cancel');

    await waitFor(() => {
      expect(screen.queryByText('Someone will stop seeing this page')).toBeNull();
    });
    expect(movePage).not.toHaveBeenCalled();
  });

  it('reports that the check failed, not that the move failed, when the access check itself fails', async () => {
    getSpaceMoveAccessLoss.mockImplementation(async () => ({ serverError: 'unexpected' }));
    renderForm();

    await openAndSelectBetaRoot();

    await waitFor(() => {
      expect(screen.getByText('Could not check who would lose access, so the page was not moved.')).toBeDefined();
    });
    expect(movePage).not.toHaveBeenCalled();
  });
});
