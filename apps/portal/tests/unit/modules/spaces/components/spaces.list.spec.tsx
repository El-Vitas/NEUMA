import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { SpacesList } from '@/modules/spaces/components/spaces.list';
import type { SpaceSummary } from '@/modules/spaces/types/spaces.types';
import en from '../../../../../messages/en.json';

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
}));

const renderSpacesList = (canCreate: boolean, spaces: readonly SpaceSummary[] = []) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SpacesList canCreate={canCreate} spaces={spaces} />
    </NextIntlClientProvider>,
  );

describe('SpacesList', () => {
  it('guides authorized members to create their first space', () => {
    renderSpacesList(true);

    expect(screen.getByRole('link', { name: 'Create space' }).getAttribute('href')).toBe('/spaces/new');
  });

  it('does not expose space creation to viewers', () => {
    renderSpacesList(false);

    expect(screen.queryByRole('link', { name: 'Create space' })).toBeNull();
  });

  it('renders each space as a single clickable row carrying a readable visibility badge', () => {
    renderSpacesList(true, [
      { id: 'space-1', name: 'Engineering', slug: 'engineering', visibility: 'PUBLIC_INTERNAL' },
      { id: 'space-2', name: 'Executive', slug: 'executive', visibility: 'RESTRICTED' },
    ]);

    const engineeringRow = screen.getByRole('link', { name: /Engineering/ });
    expect(engineeringRow.getAttribute('href')).toBe('/spaces/space-1');
    expect(engineeringRow.textContent).toContain('Visible to employees');

    const executiveRow = screen.getByRole('link', { name: /Executive/ });
    expect(executiveRow.getAttribute('href')).toBe('/spaces/space-2');
    expect(executiveRow.textContent).toContain('Restricted');
  });
});
