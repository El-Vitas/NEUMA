import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type {
  PageRelatedRow,
  PageSchema,
  PageSchemaProperty,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  readPageCollectionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
}));
mock.module('sonner', () => ({ toast: { error: () => undefined, success: () => undefined } }));

const { usePagesSchemaEditor } = await import('@/modules/pages/collections/hooks/use.pages.schema-editor');
const { PagesSchemaSettingsProperty } = await import(
  '@/modules/pages/collections/components/pages.schema.settings.property'
);

afterEach(cleanup);

const title: PageSchemaProperty = {
  config: defaultConfig,
  key: 'title',
  label: 'Title',
  options: null,
  required: true,
  type: 'TITLE',
};

const schemaWith = (...properties: PageSchemaProperty[]): PageSchema => ({
  pageId: 'collection-1',
  properties: [title, ...properties],
  spaceId: 'space-1',
  views: [],
});

const collections: PageRelatedRow[] = [
  { id: 'collection-2', title: 'Projects' },
  { id: 'collection-3', title: 'People' },
];

/** The editor lives in state, so the harness prints what it holds for the test to read. */
const Harness = ({ propertyKey, schema }: { readonly propertyKey: string; readonly schema: PageSchema }) => {
  const editor = usePagesSchemaEditor(schema, 'space-1');
  const property = editor.properties.find((candidate) => candidate.key === propertyKey);
  return (
    <>
      {property !== undefined && (
        <PagesSchemaSettingsProperty
          collections={collections}
          editor={editor}
          onGo={() => undefined}
          property={property}
        />
      )}
      <output data-testid="state">
        {JSON.stringify(editor.properties.find((candidate) => candidate.key === propertyKey))}
      </output>
    </>
  );
};

const draw = (propertyKey: string, schema: PageSchema) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Harness propertyKey={propertyKey} schema={schema} />
    </NextIntlClientProvider>,
  );

const stateOf = (): PageSchemaProperty => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const amount: PageSchemaProperty = {
  config: defaultConfig,
  key: 'amount',
  label: 'Amount',
  options: null,
  required: false,
  type: 'NUMBER',
};

describe('the page of a property in the settings', () => {
  it('lets a property be made required, and says what that means', () => {
    draw('amount', schemaWith(amount));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Required' }));

    expect(stateOf().required).toBe(true);
    expect(screen.getByText(/A new row is not created without this value/)).toBeDefined();
  });

  it('offers nothing to require for a status, which always has a value', () => {
    const stage: PageSchemaProperty = {
      ...amount,
      key: 'stage',
      label: 'Stage',
      options: [
        { color: null, group: 'TO_DO', id: 'a', value: 'Not started' },
        { color: null, group: 'IN_PROGRESS', id: 'b', value: 'Doing' },
        { color: null, group: 'COMPLETE', id: 'c', value: 'Done' },
      ],
      type: 'STATUS',
    };
    draw('stage', schemaWith(stage));

    expect(screen.queryByRole('checkbox', { name: 'Required' })).toBeNull();
  });

  it('lists the options of a status under its three groups', () => {
    const stage: PageSchemaProperty = {
      ...amount,
      key: 'stage',
      label: 'Stage',
      options: [
        { color: null, group: 'TO_DO', id: 'a', value: 'Not started' },
        { color: null, group: 'IN_PROGRESS', id: 'b', value: 'Doing' },
        { color: null, group: 'COMPLETE', id: 'c', value: 'Done' },
      ],
      type: 'STATUS',
    };
    draw('stage', schemaWith(stage));

    expect(screen.getByText('To do')).toBeDefined();
    expect(screen.getByText('In progress')).toBeDefined();
    expect(screen.getByText('Complete')).toBeDefined();
    expect(screen.getByText('Not started')).toBeDefined();
  });

  it('adds an option to the group it was typed under', () => {
    const stage: PageSchemaProperty = {
      ...amount,
      key: 'stage',
      label: 'Stage',
      options: [
        { color: null, group: 'TO_DO', id: 'a', value: 'Not started' },
        { color: null, group: 'IN_PROGRESS', id: 'b', value: 'Doing' },
        { color: null, group: 'COMPLETE', id: 'c', value: 'Done' },
      ],
      type: 'STATUS',
    };
    draw('stage', schemaWith(stage));

    fireEvent.change(screen.getByRole('textbox', { name: 'Name of the new option in "In progress"' }), {
      target: { value: 'Reviewing' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add an option' })[1] as HTMLElement);

    expect(stateOf().options?.map((option) => [option.value, option.group])).toEqual([
      ['Not started', 'TO_DO'],
      ['Doing', 'IN_PROGRESS'],
      ['Done', 'COMPLETE'],
      ['Reviewing', 'IN_PROGRESS'],
    ]);
  });

  it('keeps a status from becoming anything else, since its values are ids of its options', () => {
    const stage: PageSchemaProperty = { ...amount, key: 'stage', label: 'Stage', options: [], type: 'STATUS' };
    draw('stage', schemaWith(stage));

    expect(screen.queryByRole('combobox', { name: 'Type' })).toBeNull();
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('sets the format of a number, and asks for the currency when it is money', () => {
    draw('amount', schemaWith(amount));

    fireEvent.click(screen.getByRole('combobox', { name: 'Format' }));
    fireEvent.click(screen.getByRole('option', { name: 'Currency' }));

    expect(stateOf().config).toMatchObject({ currency: 'USD', numberFormat: 'CURRENCY' });
    expect(screen.getByRole('textbox', { name: 'Currency code' })).toBeDefined();
  });

  it('sets how many decimals a number may carry', () => {
    draw('amount', schemaWith(amount));

    fireEvent.click(screen.getByRole('combobox', { name: 'Decimals' }));
    fireEvent.click(screen.getByRole('option', { name: '2' }));

    expect(stateOf().config.decimals).toBe(2);
  });

  it('lets a person property take more than one person', () => {
    const owner: PageSchemaProperty = { ...amount, key: 'owner', label: 'Owner', type: 'PERSON' };
    draw('owner', schemaWith(owner));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow more than one person' }));

    expect(stateOf().config.allowsMultiple).toBe(true);
  });

  it('sets the prefix of a unique id and offers no way to require it', () => {
    const ticket: PageSchemaProperty = { ...amount, key: 'ticket', label: 'Ticket', type: 'UNIQUE_ID' };
    draw('ticket', schemaWith(ticket));

    fireEvent.blur(screen.getByRole('textbox', { name: 'Prefix' }), { target: { value: 'TSK' } });

    expect(stateOf().config.prefix).toBe('TSK');
    expect(screen.queryByRole('checkbox', { name: 'Required' })).toBeNull();
  });

  it('asks which collection a new relation points to, and whether the other one points back', () => {
    const related: PageSchemaProperty = {
      ...amount,
      key: 'related',
      label: 'Related',
      twoWay: false,
      type: 'RELATION',
    };
    draw('related', schemaWith(related));

    fireEvent.click(screen.getByRole('combobox', { name: 'Linked collection' }));
    fireEvent.click(screen.getByRole('option', { name: 'Projects' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Also create the property pointing back in the other collection' }),
    );

    expect(stateOf().config.targetCollectionId).toBe('collection-2');
    expect(stateOf().twoWay).toBe(true);
  });

  it('shows where a saved relation points, without offering to move it', () => {
    const related: PageSchemaProperty = {
      ...amount,
      config: { ...defaultConfig, mirrorPropertyKey: 'back', targetCollectionId: 'collection-3' },
      key: 'related',
      label: 'Related',
      type: 'RELATION',
    };
    draw('related', schemaWith(related));

    expect(screen.getByText('People')).toBeDefined();
    expect(screen.getByText(/Two-way relation/)).toBeDefined();
    expect(screen.queryByRole('combobox', { name: 'Linked collection' })).toBeNull();
  });

  it('keeps the options of a select when the type is changed to another list type', () => {
    const select: PageSchemaProperty = {
      ...amount,
      key: 'team',
      label: 'Team',
      options: asPropertyOptions('a', 'b'),
      type: 'SELECT',
    };
    draw('team', schemaWith(select));

    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Multi-select' }));

    expect(stateOf().type).toBe('MULTI_SELECT');
    expect(stateOf().options).toHaveLength(2);
  });
});
