import { describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { NO_PAGE_AGGREGATES } from '@/modules/pages/collections/constants/pages.aggregates.constants';
import type {
  PagePersonOption,
  PageSchemaProperty,
  PageViewGroup,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
const asked: Record<string, unknown>[] = [];
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  readPageMatchingRowsAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  loadMorePageRowsAction: async (input: Record<string, unknown>) => {
    asked.push(input);
    return {
      data: {
        attachedFiles: [],
        nextCursor: null,
        relatedRows: [],
        rows: [
          {
            id: 'row-3',
            lifecycle: 'ACTIVE',
            order: 2,
            parentId: 'collection-1',
            propertyValues: { status: 'todo' },
            spaceId: 'space-1',
            title: 'Third task',
          },
        ],
      },
    };
  },
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));

const { PagesCollectionGallery } = await import('@/modules/pages/collections/components/pages.collection.gallery');

const properties: PageSchemaProperty[] = [
  {
    config: defaultConfig,
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'done'),
    required: true,
    type: 'SELECT',
  },
];

const personOptions: readonly PagePersonOption[] = [];

const rowIn = (id: string, title: string, status: string) => ({
  id,
  lifecycle: 'ACTIVE' as const,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { status },
  spaceId: 'space-1',
  title,
});

const ungrouped: PageViewGroup[] = [
  {
    color: null,
    key: '',
    label: '',
    rows: [rowIn('row-1', 'First task', 'todo'), rowIn('row-2', 'Second task', 'done')],
  },
];

const grouped: PageViewGroup[] = [
  { color: null, key: 'todo', label: 'To do', rows: [rowIn('row-1', 'First task', 'todo')] },
  { color: null, key: 'done', label: 'Done', rows: [rowIn('row-2', 'Second task', 'done')] },
];

const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const drawGallery = async (groups: PageViewGroup[], isGrouped: boolean, nextCursor: null | string = null) => {
  cleanup();
  return renderWithMessages(
    await PagesCollectionGallery({
      aggregates: NO_PAGE_AGGREGATES,
      groups,
      isGrouped,
      nextCursor,
      pageId: 'collection-1',
      personOptions,
      properties,
      spaceId: 'space-1',
      viewId: 'view-gallery',
    }),
  );
};

describe('PagesCollectionGallery', () => {
  it('gives every row a card of its own', async () => {
    await drawGallery(ungrouped, false);

    expect(screen.getAllByTestId('collection-gallery-card')).toHaveLength(2);
    expect(screen.getByText('First task')).toBeDefined();
  });

  it('heads every group with its value when the view groups', async () => {
    await drawGallery(grouped, true);

    expect(screen.getByRole('heading', { name: /To do/ })).toBeDefined();
    expect(screen.getAllByTestId('collection-gallery-card')).toHaveLength(2);
  });

  it('says the collection is empty instead of drawing an empty grid', async () => {
    await drawGallery([{ color: null, key: '', label: '', rows: [] }], false);

    expect(screen.queryByTestId('collection-gallery')).toBeNull();
  });

  it('offers no way to load more when the cards drawn are all there are', async () => {
    await drawGallery(ungrouped, false);

    expect(screen.queryByTestId('collection-load-more')).toBeNull();
  });

  it('asks for the rows after the cursor and draws their cards after the first ones', async () => {
    asked.length = 0;
    await drawGallery(ungrouped, false, 'cursor-1');

    fireEvent.click(screen.getByTestId('collection-load-more'));

    expect(await screen.findByText('Third task')).toBeDefined();
    expect(asked).toEqual([
      {
        cursor: 'cursor-1',
        pageId: 'collection-1',
        quickFilter: null,
        search: '',
        spaceId: 'space-1',
        viewId: 'view-gallery',
      },
    ]);
    expect(screen.getAllByTestId('collection-gallery-card')).toHaveLength(3);
  });
});
