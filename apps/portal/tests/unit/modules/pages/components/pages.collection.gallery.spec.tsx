import { describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import type {
  PagePersonOption,
  PageSchemaProperty,
  PageViewGroup,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

const { PagesCollectionGallery } = await import('@/modules/pages/collections/components/pages.collection.gallery');

const properties: PageSchemaProperty[] = [
  { key: 'status', label: 'Status', options: asPropertyOptions('todo', 'done'), required: true, type: 'SELECT' },
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

/** Una tarjeta dibuja piezas de cliente, y una pieza de cliente pide las palabras a su manera. */
const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const drawGallery = async (groups: PageViewGroup[], isGrouped: boolean) => {
  cleanup();
  return renderWithMessages(
    await PagesCollectionGallery({ groups, isGrouped, personOptions, properties, spaceId: 'space-1' }),
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
});
