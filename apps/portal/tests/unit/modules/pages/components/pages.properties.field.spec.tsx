import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type {
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  updatePageRowPropertiesAction: async () => ({ data: undefined }),
}));

const { PagesPropertiesField } = await import('@/modules/pages/collections/components/pages.properties.field');

const onChange = mock((_value: PagePropertyValue) => undefined);

const renderField = (
  property: PageSchemaProperty,
  value: PagePropertyValue | undefined,
  personOptions: readonly PagePersonOption[] = [],
) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <span id="field-label">{property.label}</span>
      <PagesPropertiesField
        ariaLabelledBy="field-label"
        disabled={false}
        onChange={onChange}
        personOptions={personOptions}
        property={property}
        rowId="row-1"
        spaceId="space-1"
        value={value}
      />
    </NextIntlClientProvider>,
  );

const ada: PagePersonOption = {
  email: 'ada@example.com',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ada Lovelace',
};
const grace: PagePersonOption = {
  email: 'grace@example.com',
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Grace Hopper',
};

const simple = (type: PageSchemaProperty['type'], key: string, label: string): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label,
  options: null,
  required: false,
  type,
});

describe('PagesPropertiesField', () => {
  it('renders a select trigger for a SELECT property', () => {
    renderField(
      {
        config: defaultConfig,
        key: 'status',
        label: 'Status',
        options: asPropertyOptions('todo', 'done'),
        required: true,
        type: 'SELECT',
      },
      undefined,
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDefined();
  });

  it('renders the name of the chosen option for a SELECT value, not its identifier', () => {
    renderField(
      {
        config: defaultConfig,
        key: 'priority',
        label: 'Priority',
        options: [
          { color: null, group: null, id: 'a1b2c3d4', value: 'High priority' },
          { color: null, group: null, id: 'e5f6g7h8', value: 'Low' },
        ],
        required: true,
        type: 'SELECT',
      },
      'a1b2c3d4',
    );
    expect(screen.getByText('High priority')).toBeDefined();
    expect(screen.queryByText('a1b2c3d4')).toBeNull();
  });

  it('renders a checkbox per option for a MULTI_SELECT property', () => {
    renderField(
      {
        config: defaultConfig,
        key: 'team',
        label: 'Team',
        options: asPropertyOptions('design', 'engineering'),
        required: false,
        type: 'MULTI_SELECT',
      },
      ['design'],
    );
    expect(screen.getByRole('checkbox', { name: 'design' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'engineering' }).getAttribute('aria-checked')).toBe('false');
  });

  it('renders a single checkbox for a CHECKBOX property', () => {
    renderField(simple('CHECKBOX', 'blocked', 'Blocked'), true);
    expect(screen.getByRole('checkbox', { name: 'Blocked' }).getAttribute('aria-checked')).toBe('true');
  });

  it('renders a start and an end date for a DATE property and fills them from the range', () => {
    renderField(simple('DATE', 'dueDate', 'Due date'), { end: '2026-08-07', start: '2026-08-05' });
    expect(screen.getByLabelText('Due date')).toHaveProperty('value', '2026-08-05');
    expect(screen.getByLabelText('End date (optional)')).toHaveProperty('value', '2026-08-07');
  });

  it('writes a date record when a day is picked', () => {
    onChange.mockClear();
    renderField(simple('DATE', 'dueDate', 'Due date'), undefined);

    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-08-05' } });

    expect(onChange).toHaveBeenCalledWith({ start: '2026-08-05' });
  });

  it('commits a date only when focus leaves the field, not when it moves from the start to the end', () => {
    const committed = mock(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <span id="field-label">Due date</span>
        <PagesPropertiesField
          ariaLabelledBy="field-label"
          disabled={false}
          onBlur={committed}
          onChange={onChange}
          property={simple('DATE', 'dueDate', 'Due date')}
          value={{ start: '2026-08-05' }}
        />
        <button type="button">elsewhere</button>
      </NextIntlClientProvider>,
    );
    const start = screen.getByLabelText('Due date');
    const end = screen.getByLabelText('End date (optional)');

    fireEvent.blur(start, { relatedTarget: end });
    expect(committed).not.toHaveBeenCalled();

    fireEvent.blur(end, { relatedTarget: screen.getByRole('button', { name: 'elsewhere' }) });
    expect(committed).toHaveBeenCalledTimes(1);
  });

  it('will not take an end date before a start date has been picked', () => {
    renderField(simple('DATE', 'dueDate', 'Due date'), undefined);
    expect(screen.getByLabelText('End date (optional)')).toHaveProperty('disabled', true);
  });

  it('renders a number input for a NUMBER property', () => {
    renderField(simple('NUMBER', 'estimate', 'Estimate'), 3);
    expect(screen.getByLabelText('Estimate')).toHaveProperty('type', 'number');
  });

  it('types a percent as a percent and writes it as a fraction', () => {
    onChange.mockClear();
    renderField(
      { ...simple('NUMBER', 'progress', 'Progress'), config: { ...defaultConfig, numberFormat: 'PERCENT' } },
      0.25,
    );

    expect(screen.getByLabelText('Progress')).toHaveProperty('value', '25');
    fireEvent.change(screen.getByLabelText('Progress'), { target: { value: '40' } });

    expect(onChange).toHaveBeenCalledWith(0.4);
  });

  it('renders a text input for a RICH_TEXT property', () => {
    renderField(simple('RICH_TEXT', 'summary', 'Summary'), 'note');
    expect(screen.getByLabelText('Summary')).toHaveProperty('type', 'text');
  });

  it.each([
    ['URL', 'Site', 'https://example.com', 'url'],
    ['EMAIL', 'Mail', 'ada@example.com', 'email'],
    ['PHONE', 'Phone', '+56 9 1234 5678', 'tel'],
  ] as const)('asks for the kind of text a %s is', (type, label, value, inputType) => {
    renderField(simple(type, 'field', label), value);

    expect(screen.getByLabelText(label)).toHaveProperty('type', inputType);
  });

  it('renders a person picker showing the assignee name for a PERSON property', () => {
    renderField(simple('PERSON', 'assignee', 'Assignee'), [ada.id], [ada, grace]);
    expect(screen.getByRole('combobox', { name: 'Assignee' })).toBeDefined();
    expect(screen.getByText('Ada Lovelace')).toBeDefined();
  });

  it('writes the person as a list of one', () => {
    onChange.mockClear();
    renderField(simple('PERSON', 'assignee', 'Assignee'), [], [ada, grace]);

    fireEvent.click(screen.getByRole('combobox', { name: 'Assignee' }));
    fireEvent.click(screen.getByRole('option', { name: 'Grace Hopper' }));

    expect(onChange).toHaveBeenCalledWith([grace.id]);
  });

  it('renders a checkbox per member when the person property allows several', () => {
    renderField(
      { ...simple('PERSON', 'reviewers', 'Reviewers'), config: { ...defaultConfig, allowsMultiple: true } },
      [ada.id],
      [ada, grace],
    );

    expect(screen.getByRole('checkbox', { name: 'Ada Lovelace' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Grace Hopper' }).getAttribute('aria-checked')).toBe('false');
  });

  it('degrades honestly when a PERSON value does not match any known member', () => {
    renderField(simple('PERSON', 'assignee', 'Assignee'), ['99999999-9999-4999-8999-999999999999'], [ada]);
    expect(screen.getByText('Unknown member')).toBeDefined();
  });

  it('shows a muted placeholder instead of an empty box for an unset text property', () => {
    renderField(simple('RICH_TEXT', 'summary', 'Summary'), undefined);
    expect(screen.getByLabelText('Summary')).toHaveProperty('placeholder', 'Empty');
  });

  it('shows what the server fills as text that cannot be edited', () => {
    renderField({ ...simple('UNIQUE_ID', 'ticket', 'Ticket'), config: { ...defaultConfig, prefix: 'TSK' } }, 7);

    expect(screen.getByText('TSK-7')).toBeDefined();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('lists the files uploaded to the row to tick, and says so when there are none', () => {
    renderField(simple('FILES', 'attachments', 'Attachments'), []);
    expect(screen.getByText(/This page has no files/)).toBeDefined();
  });

  it('offers a way to add a row to a relation and names the rows already there', () => {
    renderField(
      { ...simple('RELATION', 'related', 'Related'), config: { ...defaultConfig, targetCollectionId: 'other' } },
      ['row-9'],
    );

    expect(screen.getByRole('button', { name: 'Add a row to Related' })).toBeDefined();
  });
});
