import { describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { PagesCollectionCardAppearanceProvider } from '@/modules/pages/collections/components/pages.collection.card-appearance.provider';
import { NO_PAGE_AGGREGATES } from '@/modules/pages/collections/constants/pages.aggregates.constants';
import { EMPTY_PAGE_COLLECTION_LOOKUPS } from '@/modules/pages/collections/constants/pages.lookups.constants';
import { PAGE_COLLECTION_LOOKUPS_CONTEXT } from '@/modules/pages/collections/constants/pages.lookups.context.constants';
import type {
  PageAttachedFile,
  PagePersonOption,
  PageSchema,
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
  applyPageViewOperationsAction: async () => ({ data: { configuration: {}, id: 'view-gallery', version: 1 } }),
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

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [] };

const drawGallery = async (
  groups: PageViewGroup[],
  isGrouped: boolean,
  nextCursor: null | string = null,
  extra: { cardSize?: 'LARGE' | 'MEDIUM' | 'SMALL'; coverProperty?: null | string; files?: PageAttachedFile[] } = {},
) => {
  cleanup();
  return renderWithMessages(
    <PAGE_COLLECTION_LOOKUPS_CONTEXT value={{ ...EMPTY_PAGE_COLLECTION_LOOKUPS, attachedFiles: extra.files ?? [] }}>
      <PagesCollectionCardAppearanceProvider
        coverProperty={extra.coverProperty ?? null}
        size={extra.cardSize ?? 'MEDIUM'}
      >
        {
          await PagesCollectionGallery({
            activeViewName: 'Gallery',
            aggregates: NO_PAGE_AGGREGATES,
            canEdit: true,
            cardSize: extra.cardSize ?? 'MEDIUM',
            groups,
            isGrouped,
            nextCursor,
            pageId: 'collection-1',
            personOptions,
            properties,
            schema,
            spaceId: 'space-1',
            viewId: 'view-gallery',
          })
        }
      </PagesCollectionCardAppearanceProvider>
    </PAGE_COLLECTION_LOOKUPS_CONTEXT>,
  );
};

describe('the size and the cover of the cards of a gallery', () => {
  const photographed: PageViewGroup[] = [
    {
      color: null,
      key: '',
      label: '',
      rows: [
        { ...rowIn('row-1', 'With a photo', 'todo'), propertyValues: { photos: ['file-1'], status: 'todo' } },
        { ...rowIn('row-2', 'Without', 'todo'), propertyValues: { photos: [], status: 'todo' } },
      ],
    },
  ];
  const files = [{ id: 'file-1', mimeType: 'image/png', name: 'a.png', size: 10 }];

  it('draws a cover only on the cards whose row has an image in the property of the view', async () => {
    await drawGallery(photographed, false, null, { coverProperty: 'photos', files });

    expect(screen.getAllByTestId('collection-card-cover')).toHaveLength(1);
  });

  it('draws no cover when the view names none', async () => {
    await drawGallery(photographed, false, null, { files });

    expect(screen.queryByTestId('collection-card-cover')).toBeNull();
  });

  it('packs more cards in a row the smaller they are', async () => {
    await drawGallery(ungrouped, false, null, { cardSize: 'SMALL' });
    expect(screen.getAllByTestId('collection-gallery-card')[0]?.parentElement?.className).toContain('10rem');

    await drawGallery(ungrouped, false, null, { cardSize: 'LARGE' });
    expect(screen.getAllByTestId('collection-gallery-card')[0]?.parentElement?.className).toContain('22rem');
  });

  it('offers to change both to whoever may edit the view', async () => {
    await drawGallery(ungrouped, false);

    expect(screen.getByRole('button', { name: 'How the cards look' })).toBeDefined();
  });
});

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
