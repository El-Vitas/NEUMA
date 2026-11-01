import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import en from '../../../../../messages/en.json';

type ActionResult<T> = { data: T } | { serverError: string };

const movePage = mock(async () => ({ data: undefined }));
const getSpaceMoveAccessLoss = mock(async (): Promise<ActionResult<{ count: number }>> => ({ data: { count: 0 } }));
const defaultDestinations = (_isOpen: boolean, _pageId: string, _spaceId: string, _query: string) => ({
  pages: [{ id: 'page-b', spaceId: 'space-a', title: 'Notes' }],
  parentTitle: null as string | null,
  spaces: [
    { id: 'space-a', name: 'Alpha' },
    { id: 'space-b', name: 'Beta' },
  ],
});
const useMoveDestinations = mock(defaultDestinations);

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

// The dialog opens while the access check transition is still running, so its buttons start disabled.
const clickOnceEnabled = async (name: string): Promise<void> => {
  const button = await screen.findByRole<HTMLButtonElement>('button', { name });
  await waitFor(() => {
    expect(button.disabled).toBe(false);
  });
  fireEvent.click(button);
};

describe('PagesMoveForm — choosing where to move', () => {
  afterEach(() => {
    mock.clearAllMocks();
    useMoveDestinations.mockImplementation(defaultDestinations);
  });

  it('asks for what is typed instead of filtering a list it already holds', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Space root/i }));

    fireEvent.change(await screen.findByPlaceholderText(en.pages.moveSearch), { target: { value: 'road' } });

    await waitFor(() => {
      expect(useMoveDestinations).toHaveBeenLastCalledWith(true, 'page-a', 'space-a', 'road');
    });
  });

  it('keeps what the server found even when its title does not contain the typed text', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Space root/i }));

    fireEvent.change(await screen.findByPlaceholderText(en.pages.moveSearch), { target: { value: 'zzz' } });

    expect(await screen.findByRole('option', { name: 'Notes' })).toBeDefined();
  });

  it('names the page it hangs from now, as the server says', async () => {
    useMoveDestinations.mockImplementation(() => ({
      pages: [{ id: 'page-b', spaceId: 'space-a', title: 'Notes' }],
      parentTitle: 'Handbook',
      spaces: [{ id: 'space-a', name: 'Alpha' }],
    }));
    const nested = { ...page, parentId: 'page-p' } as Parameters<typeof PagesMoveForm>[0]['page'];

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesMoveForm ariaLabelledBy="move-label" page={nested} spaceId="space-a" />
      </NextIntlClientProvider>,
    );

    expect(await screen.findByRole('button', { name: /Handbook/ })).toBeDefined();
  });
});

describe('PagesMoveForm — moving across spaces', () => {
  afterEach(() => {
    mock.clearAllMocks();
    // `clearAllMocks` keeps the `mockImplementationOnce` queue, so an unspent answer would leak into the next test.
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

  it('says the page is locked, not that the move failed, when the page cannot be moved because it is locked', async () => {
    movePage.mockImplementation(async () => ({ serverError: 'locked' }) as never);
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Space root/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Notes' }));

    expect(await screen.findByText(en.errors.reasons.locked)).toBeDefined();
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

    // Asserts on the visible message: other specs stand in for this actions module differently.
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
