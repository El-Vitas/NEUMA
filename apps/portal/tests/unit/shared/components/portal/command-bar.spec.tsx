import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RECENT_PAGES_STORAGE_KEY } from '@/shared/constants/recents.constants';
import en from '../../../../../messages/en.json';
import es from '../../../../../messages/es.json';

const push = mock(() => undefined);

mock.module('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
}));

/** Starting a page reaches a server action, which refuses to load outside a server. */
mock.module('@/shared/hooks/use.pages-start.hook', () => ({
  usePagesStart: () => ({ isStarting: false, startPage: () => undefined }),
}));

mock.module('@/modules/search/server/actions/search.instant.actions', () => ({
  searchInstantPageCandidatesAction: mock(async () => ({ data: [] })),
}));

const { PortalCommandBar } = await import('@/shared/components/portal/command-bar');

const renderCommandBar = (onOpenChange: (open: boolean) => void = mock(() => undefined)) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PortalCommandBar onOpenChange={onOpenChange} open />
    </NextIntlClientProvider>,
  );

describe('PortalCommandBar', () => {
  it('gives the command dialog a localized accessible name', () => {
    renderCommandBar();

    expect(screen.getByRole('dialog', { name: 'Quick finder' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Quick finder' })).toBeDefined();
  });

  it('opens the search results page for the highlighted result when Enter is pressed', () => {
    push.mockClear();
    renderCommandBar();

    const input = screen.getByPlaceholderText('Search a page or type a command');
    fireEvent.change(input, { target: { value: 'onboarding plan' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/search?query=onboarding%20plan');
  });

  it('closes and navigates when an action is chosen', () => {
    push.mockClear();
    const onOpenChange = mock(() => undefined);
    renderCommandBar(onOpenChange);

    fireEvent.click(screen.getByText('Go home'));

    expect(push).toHaveBeenCalledWith('/');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('offers a way to reach the spaces list and the trash from anywhere', () => {
    push.mockClear();
    renderCommandBar();

    fireEvent.click(screen.getByText('Go to a space'));
    expect(push).toHaveBeenCalledWith('/spaces');

    fireEvent.click(screen.getByText('Open the trash'));
    expect(push).toHaveBeenCalledWith('/trash');
  });

  it('shows recently viewed pages before anything is typed', () => {
    localStorage.setItem(
      RECENT_PAGES_STORAGE_KEY,
      JSON.stringify([
        { pageId: 'page-1', spaceId: 'space-1', spaceName: 'Engineering', title: 'Roadmap', visitedAt: 1 },
      ]),
    );

    renderCommandBar();

    expect(screen.getByText('Recently viewed')).toBeDefined();
    expect(screen.getByText('Roadmap')).toBeDefined();
    localStorage.removeItem(RECENT_PAGES_STORAGE_KEY);
  });

  it('re-reads recently viewed pages every time it opens, instead of freezing the list at mount', () => {
    localStorage.removeItem(RECENT_PAGES_STORAGE_KEY);
    const onOpenChange = mock(() => undefined);
    const { rerender } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PortalCommandBar onOpenChange={onOpenChange} open={false} />
      </NextIntlClientProvider>,
    );

    localStorage.setItem(
      RECENT_PAGES_STORAGE_KEY,
      JSON.stringify([
        { pageId: 'page-1', spaceId: 'space-1', spaceName: 'Engineering', title: 'Roadmap', visitedAt: 1 },
      ]),
    );

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <PortalCommandBar onOpenChange={onOpenChange} open />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('Roadmap')).toBeDefined();
    localStorage.removeItem(RECENT_PAGES_STORAGE_KEY);
  });

  it('lets a person find an action by the words shown on screen, in their own language', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <PortalCommandBar onOpenChange={mock(() => undefined)} open />
      </NextIntlClientProvider>,
    );

    const input = screen.getByPlaceholderText('Busca una página o escribe una acción');
    fireEvent.change(input, { target: { value: 'papelera' } });

    expect(screen.getByText('Abrir la papelera')).toBeDefined();
    expect(screen.queryByText('Ir al inicio')).toBeNull();
  });
});
