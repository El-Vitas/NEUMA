import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { defaultConfig } from '../lib/pages.options.fixture';

interface RelationChange {
  readonly change: string;
  readonly propertyKey: string;
  readonly rowId: string;
  readonly spaceId: string;
  readonly targetId: string;
}

const changes: RelationChange[] = [];
const searches: string[] = [];
let manyMore: { id: string; title: string }[] = [];
const errors: string[] = [];
let outcome: 'CHANGED' | 'MIRROR_FORBIDDEN' = 'CHANGED';

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async (input: RelationChange) => {
    changes.push(input);
    return { data: outcome };
  },
  listPageRelationCandidatesAction: async (input: { search?: string }) => {
    searches.push(input.search ?? '');
    return {
      data: [{ id: 'row-1', title: 'Roadmap' }, { id: 'row-2', title: 'Budget' }, ...manyMore],
    };
  },
  updatePageRowPropertiesAction: async () => ({ data: undefined }),
}));
mock.module('sonner', () => ({
  toast: { error: (message: string) => errors.push(message), success: () => undefined },
}));

const { PagesPropertiesRelationField } = await import(
  '@/modules/pages/collections/components/pages.properties.relation-field'
);
const { PagesCollectionLookupsProvider } = await import(
  '@/modules/pages/collections/components/pages.collection.lookups.provider'
);

const related: PageSchemaProperty = {
  config: { ...defaultConfig, targetCollectionId: 'collection-2' },
  key: 'related',
  label: 'Related',
  options: null,
  required: false,
  type: 'RELATION',
};

const draw = (value: readonly string[], disabled = false) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesCollectionLookupsProvider
        lookups={{ attachedFiles: [], people: [], relatedRows: [{ id: 'row-3', title: 'Hiring plan' }] }}
      >
        <PagesPropertiesRelationField
          ariaLabelledBy="label"
          disabled={disabled}
          fieldId="field"
          property={related}
          rowId="row-0"
          spaceId="space-1"
          value={value}
        />
      </PagesCollectionLookupsProvider>
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  changes.length = 0;
  searches.length = 0;
  manyMore = [];
  errors.length = 0;
  outcome = 'CHANGED';
});
afterEach(cleanup);

describe('the cell of a relation', () => {
  it('names the rows it points to', () => {
    draw(['row-3']);

    expect(screen.getByText('Hiring plan')).toBeDefined();
  });

  it('adds one row at a time, naming the row, the property and the space', async () => {
    draw([]);

    fireEvent.click(screen.getByRole('button', { name: 'Add a row to Related' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Roadmap' }));

    await waitFor(() => expect(changes).toHaveLength(1));
    expect(changes[0]).toEqual({
      change: 'ADD',
      propertyKey: 'related',
      rowId: 'row-0',
      spaceId: 'space-1',
      targetId: 'row-1',
    });
  });

  it('narrows the rows it offers by what is typed, and leaves out the ones already there', async () => {
    draw(['row-1']);

    fireEvent.click(screen.getByRole('button', { name: 'Add a row to Related' }));
    await screen.findByRole('button', { name: 'Budget' });

    expect(screen.queryByRole('button', { name: 'Roadmap' })).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search for a row' }), { target: { value: 'zzz' } });
    expect(screen.getByText('There are no rows to add.')).toBeDefined();
  });

  it('asks the server for the rows that hold what was typed instead of reading the whole collection', async () => {
    draw([]);

    fireEvent.click(screen.getByRole('button', { name: 'Add a row to Related' }));
    await screen.findByRole('button', { name: 'Budget' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for a row' }), { target: { value: 'bud' } });

    await waitFor(() => expect(searches).toEqual(['', 'bud']));
  });

  it('says there are more rows when the server filled a whole screenful', async () => {
    manyMore = Array.from({ length: 48 }, (_, position) => ({
      id: `more-${String(position)}`,
      title: `Row ${String(position)}`,
    }));
    draw([]);

    fireEvent.click(screen.getByRole('button', { name: 'Add a row to Related' }));

    expect(await screen.findByText('There are more rows. Type to narrow them down.')).toBeDefined();
  });

  it('says nothing about more rows when the answer is short', async () => {
    draw([]);

    fireEvent.click(screen.getByRole('button', { name: 'Add a row to Related' }));
    await screen.findByRole('button', { name: 'Budget' });

    expect(screen.queryByText('There are more rows. Type to narrow them down.')).toBeNull();
  });

  it('removes one row at a time', async () => {
    draw(['row-3']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Hiring plan' }));

    await waitFor(() => expect(changes).toHaveLength(1));
    expect(changes[0]).toMatchObject({ change: 'REMOVE', targetId: 'row-3' });
  });

  it('says that the row on the other side cannot be edited, instead of failing without a reason', async () => {
    outcome = 'MIRROR_FORBIDDEN';
    draw([]);

    fireEvent.click(screen.getByRole('button', { name: 'Add a row to Related' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Budget' }));

    await waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0]).toContain('other side of this two-way relation');
  });

  it('offers no way to change a relation to whoever may not edit the row', () => {
    draw(['row-3'], true);

    expect(screen.queryByRole('button', { name: 'Add a row to Related' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove Hiring plan' })).toBeNull();
    expect(screen.getByText('Hiring plan')).toBeDefined();
  });
});
