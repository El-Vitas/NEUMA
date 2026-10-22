import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { TrashedPage } from '@/modules/pages/trash/types/pages.trash.types';
import en from '../../../../../messages/en.json';

const trashedPage = (id: string): TrashedPage => ({
  deletedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedBy: null,
  id,
  isTemplate: false,
  parentId: null,
  purgeAfter: null,
  spaceId: 'space-1',
  title: `Title ${id}`,
  trashedChildCount: 0,
});

const readWindow = mock(async (_input: { search?: string; skip: number }) => ({
  data: { items: [trashedPage('next-1'), trashedPage('next-2')], total: 4 },
}));

mock.module('@/modules/pages/trash/server/actions/pages.trash.actions', () => ({
  readTrashedPagesWindowAction: readWindow,
}));
/** The row reaches server actions of its own, which refuse to load outside a server. */
mock.module('@/modules/pages/trash/components/pages.trash.item', () => ({
  PagesTrashItem: ({ page }: { readonly page: TrashedPage }) => <li>{page.title}</li>,
}));

const { PagesTrashMore } = await import('@/modules/pages/trash/components/pages.trash.more');

const renderMore = (loadedCount: number, total: number, search = '') =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesTrashMore canDeleteForever loadedCount={loadedCount} locale="en" search={search} total={total} />
    </NextIntlClientProvider>,
  );

describe('PagesTrashMore', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('offers nothing when the window already holds everything in the trash', () => {
    renderMore(2, 2);

    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('reads the next window from where the page stopped and shows it below', async () => {
    renderMore(2, 4, 'plan');

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Title next-1')).toBeDefined();
    expect(readWindow).toHaveBeenCalledWith({ search: 'plan', skip: 2 });
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });
});
