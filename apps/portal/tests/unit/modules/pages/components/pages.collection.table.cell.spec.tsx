import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PagePropertyValue, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { defaultConfig } from '../lib/pages.options.fixture';

const written: { propertyValues: Record<string, unknown> }[] = [];

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  updatePageRowPropertiesAction: async (input: { propertyValues: Record<string, unknown> }) => {
    written.push(input);
    return { data: null };
  },
}));
mock.module('sonner', () => ({ toast: { error: () => undefined, success: () => undefined } }));

const { PagesCollectionTableCell } = await import('@/modules/pages/collections/components/pages.collection.table.cell');

beforeEach(() => {
  written.length = 0;
});
afterEach(cleanup);

const property = (
  type: PageSchemaProperty['type'],
  overrides: Partial<PageSchemaProperty> = {},
): PageSchemaProperty => ({
  config: defaultConfig,
  key: 'p',
  label: 'Field',
  options: null,
  required: false,
  type,
  ...overrides,
});

const draw = (target: PageSchemaProperty, value: PagePropertyValue | undefined, canEdit = true) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <span id="header">Field</span>
      <PagesCollectionTableCell
        alignmentClass=""
        ariaLabelledBy="header"
        canEdit={canEdit}
        contentClass=""
        controlClass=""
        property={target}
        rowId="row-1"
        spaceId="space-1"
        value={value}
      />
    </NextIntlClientProvider>,
  );

describe('a cell of the table', () => {
  it('cannot be edited when the server fills it', () => {
    draw(property('UNIQUE_ID', { config: { ...defaultConfig, prefix: 'TSK' } }), 5);

    expect(screen.queryByRole('button', { name: 'Edit Field' })).toBeNull();
    expect(screen.getByText('TSK-5')).toBeDefined();
  });

  it('cannot be edited in place when it holds files, which are chosen among the ones of the row', () => {
    draw(property('FILES'), []);

    expect(screen.queryByRole('button', { name: 'Edit Field' })).toBeNull();
  });

  it('writes an emptied text as a removal, not as an empty answer', async () => {
    draw(property('RICH_TEXT'), 'old');

    fireEvent.click(screen.getByRole('button', { name: 'Edit Field' }));
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.propertyValues).toEqual({ p: null });
  });

  it('writes a date as a record', async () => {
    draw(property('DATE'), undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Field' }));
    fireEvent.change(screen.getByLabelText('Field', { selector: 'input' }), { target: { value: '2026-04-02' } });
    fireEvent.blur(screen.getByLabelText('Field', { selector: 'input' }));

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.propertyValues).toEqual({ p: { start: '2026-04-02' } });
  });

  it('shows a plain value to whoever may not edit', () => {
    draw(property('RICH_TEXT'), 'note', false);

    expect(screen.queryByRole('button', { name: 'Edit Field' })).toBeNull();
    expect(screen.getByText('note')).toBeDefined();
  });
});
