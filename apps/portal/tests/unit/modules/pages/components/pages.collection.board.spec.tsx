import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PageBoardColumn } from '@/modules/pages/collections/types/pages.schema.types';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
}));

const { PagesCollectionBoard } = await import('@/modules/pages/collections/components/pages.collection.board');
const { PagesCollectionBoardMissingGrouping } = await import(
  '@/modules/pages/collections/components/pages.collection.board.missing-grouping'
);

const columns: PageBoardColumn[] = [
  {
    key: 'todo',
    label: 'todo',
    rows: [
      {
        id: 'row-1',
        lifecycle: 'ACTIVE',
        order: 0,
        parentId: 'collection-1',
        propertyValues: {},
        spaceId: 'space-1',
        title: 'First task',
      },
    ],
  },
  { key: 'done', label: 'done', rows: [] },
];

describe('PagesCollectionBoard', () => {
  it('groups rows under their column and shows an empty message for a column without rows', async () => {
    render(await PagesCollectionBoard({ columns, spaceId: 'space-1' }));

    expect(screen.getByRole('link', { name: 'First task' }).getAttribute('href')).toBe('?panel=row-1');
    /** Asked for by where it leads: a server component's words are not translated here. */
    const fullPage = screen.getAllByRole('link').find((link) => link.getAttribute('href')?.startsWith('/spaces/'));

    expect(fullPage?.getAttribute('href')).toBe('/spaces/space-1/pages/row-1');
    expect(screen.getByText('collection.emptyColumn')).toBeDefined();
  });
});

describe('PagesCollectionBoardMissingGrouping', () => {
  it('renders a distinct state instead of pretending the board is empty', async () => {
    render(await PagesCollectionBoardMissingGrouping());

    expect(screen.getByTestId('collection-board-missing-grouping-property')).toBeDefined();
    expect(screen.getByText('collection.missingGroupingProperty')).toBeDefined();
  });
});
