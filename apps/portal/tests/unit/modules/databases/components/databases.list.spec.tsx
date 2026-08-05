import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

mock.module('@/modules/databases/server/actions/databases.actions', () => ({
  createDatabaseAction: mock(async () => ({ data: undefined })),
}));

const { DatabasesList } = await import('@/modules/databases/components/databases.list');

const spaces = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Engineering' }];

const renderList = (canManage: boolean) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DatabasesList canManage={canManage} databases={[]} spaces={spaces} />
    </NextIntlClientProvider>,
  );

describe('DatabasesList', () => {
  it('guides managers to the create dialog when no databases exist', () => {
    renderList(true);

    expect(screen.getByRole('button', { name: 'New database' }).getAttribute('type')).toBe('button');
  });

  it('does not expose a create action to viewers', () => {
    renderList(false);

    expect(screen.queryByRole('button', { name: 'New database' })).toBeNull();
  });
});
