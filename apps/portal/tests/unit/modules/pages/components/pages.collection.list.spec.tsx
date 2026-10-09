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

const { PagesCollectionList } = await import('@/modules/pages/collections/components/pages.collection.list');

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

const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const drawList = async (groups: PageViewGroup[], isGrouped: boolean) => {
  cleanup();
  return renderWithMessages(
    await PagesCollectionList({ groups, isGrouped, personOptions, properties, spaceId: 'space-1' }),
  );
};

describe('PagesCollectionList', () => {
  it('reads every row one under the other when nobody asked to group', async () => {
    await drawList(ungrouped, false);

    expect(screen.getByTestId('collection-list')).toBeDefined();
    expect(screen.getByText('First task')).toBeDefined();
    expect(screen.getByText('Second task')).toBeDefined();
  });

  it('says what each row holds besides its name', async () => {
    await drawList(ungrouped, false);

    expect(screen.getByText('Todo')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('heads every group with its value and how many rows it carries', async () => {
    await drawList(grouped, true);

    expect(screen.getByRole('heading', { name: /To do/ })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Done/ })).toBeDefined();
  });

  it('says the collection is empty instead of drawing nothing', async () => {
    await drawList([{ color: null, key: '', label: '', rows: [] }], false);

    expect(screen.queryByTestId('collection-list')).toBeNull();
  });
});
