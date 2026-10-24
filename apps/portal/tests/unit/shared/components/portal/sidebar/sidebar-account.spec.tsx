import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { FormEvent, ReactNode } from 'react';
import { RecentsOwnerProvider } from '@/shared/components/portal/recents-owner.provider';
import { buildRecentPagesStorageKey } from '@/shared/lib/recents.lib';
import en from '../../../../../../messages/en.json';

let describeUnknown: (() => string) | undefined;
let describeKnown: ((count: number) => string) | undefined;
let holdsSubmitBack = false;

const passThrough = ({ children }: { readonly children?: ReactNode }) => <>{children}</>;

mock.module('@/i18n/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));
mock.module('@/modules/auth/server/lib/auth.logout.server', () => ({ logout: async () => undefined }));
mock.module('@/modules/pages/local-cache/hooks/use.local-cache.sign-out', () => ({
  useLocalCacheSignOut: (known: (count: number) => string, unknown?: () => string) => {
    describeKnown = known;
    describeUnknown = unknown;
    return (event: FormEvent<HTMLFormElement>) => {
      if (holdsSubmitBack) event.preventDefault();
    };
  },
}));
mock.module('@/shared/components/language/language.menu', () => ({ LanguageMenu: () => null }));
mock.module('@/shared/components/theme/theme.menu', () => ({ ThemeMenu: () => null }));
mock.module('@/shared/components/ui/dropdown-menu', () => ({
  DropdownMenu: passThrough,
  DropdownMenuContent: passThrough,
  DropdownMenuItem: passThrough,
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: passThrough,
}));

const { SidebarAccount } = await import('@/shared/components/portal/sidebar/sidebar-account');

const recentsKey = buildRecentPagesStorageKey('user-1');

const renderAccount = () =>
  render(
    <RecentsOwnerProvider userId="user-1">
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarAccount collapsed={false} themeChoice="system" user={{ email: 'ana@example.com', name: 'Ana' }} />
      </NextIntlClientProvider>
    </RecentsOwnerProvider>,
  );

describe('SidebarAccount sign-out confirmation', () => {
  afterEach(() => {
    localStorage.clear();
    holdsSubmitBack = false;
  });

  it('warns that unsent changes may exist when the pending count could not be read', () => {
    renderAccount();

    expect(describeUnknown?.()).toBe(en.navigation.logoutPendingUnknown);
    expect(describeKnown?.(2)).toContain('2 changes');
  });

  it('keeps the recent pages while the sign-out is still being confirmed', () => {
    holdsSubmitBack = true;
    localStorage.setItem(recentsKey, '[]');
    renderAccount();

    fireEvent.submit(screen.getByRole('button', { name: 'Log out' }));

    expect(localStorage.getItem(recentsKey)).not.toBeNull();
  });

  it('forgets the recent pages once the sign-out goes through', () => {
    holdsSubmitBack = false;
    localStorage.setItem(recentsKey, '[]');
    renderAccount();

    fireEvent.submit(screen.getByRole('button', { name: 'Log out' }));

    expect(localStorage.getItem(recentsKey)).toBeNull();
  });
});
