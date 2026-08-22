import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type {
  PageSchemaProperty,
  PageSchemaView,
  PageViewOutcome,
} from '@/modules/pages/collections/types/pages.schema.types';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
}));

const { PagesCollectionSection } = await import('@/modules/pages/collections/components/pages.collection.section');

const properties: PageSchemaProperty[] = [
  { key: 'status', label: 'Status', options: ['todo', 'in_progress', 'done'], required: true, type: 'SELECT' },
];

const boardView: PageSchemaView = {
  configuration: { groupBy: 'status' },
  isDefault: false,
  name: 'Board',
  type: 'BOARD',
};

describe('PagesCollectionSection', () => {
  it('shows the missing-grouping-property state instead of an empty board when the outcome says so', async () => {
    const outcome: PageViewOutcome = { kind: 'BOARD_MISSING_GROUPING_PROPERTY' };
    render(await PagesCollectionSection({ properties, spaceId: 'space-1', views: [{ outcome, view: boardView }] }));

    expect(screen.getByTestId('collection-board-missing-grouping-property')).toBeDefined();
    expect(screen.queryByTestId('collection-board')).toBeNull();
  });

  it('renders an empty board distinctly from the missing-grouping-property state', async () => {
    const outcome: PageViewOutcome = {
      columns: [
        { key: 'todo', label: 'todo', rows: [] },
        { key: 'in_progress', label: 'in_progress', rows: [] },
        { key: 'done', label: 'done', rows: [] },
      ],
      kind: 'BOARD_COLUMNS',
    };
    render(await PagesCollectionSection({ properties, spaceId: 'space-1', views: [{ outcome, view: boardView }] }));

    expect(screen.getByTestId('collection-board')).toBeDefined();
    expect(screen.queryByTestId('collection-board-missing-grouping-property')).toBeNull();
  });

  it('shows a load error when the view outcome could not be fetched', async () => {
    render(
      await PagesCollectionSection({ properties, spaceId: 'space-1', views: [{ outcome: null, view: boardView }] }),
    );

    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('renders nothing when the schema defines no views', async () => {
    const { container } = render(await PagesCollectionSection({ properties, spaceId: 'space-1', views: [] }));
    expect(container.firstElementChild).toBeNull();
  });
});
