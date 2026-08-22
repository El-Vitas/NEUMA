import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type {
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';

const { PagesPropertiesField } = await import('@/modules/pages/collections/components/pages.properties.field');

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
        onChange={mock(() => undefined)}
        personOptions={personOptions}
        property={property}
        value={value}
      />
    </NextIntlClientProvider>,
  );

describe('PagesPropertiesField', () => {
  it('renders a select trigger for a SELECT property', () => {
    renderField(
      { key: 'status', label: 'Status', options: ['todo', 'done'], required: true, type: 'SELECT' },
      undefined,
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDefined();
  });

  it('renders a human label for a SELECT value instead of the raw stored value', () => {
    renderField(
      { key: 'status', label: 'Status', options: ['todo', 'in_progress', 'done'], required: true, type: 'SELECT' },
      'in_progress',
    );
    expect(screen.getByText('In progress')).toBeDefined();
    expect(screen.queryByText('in_progress')).toBeNull();
  });

  it('renders a checkbox per option for a MULTI_SELECT property', () => {
    renderField(
      { key: 'team', label: 'Team', options: ['design', 'engineering'], required: false, type: 'MULTI_SELECT' },
      ['design'],
    );
    expect(screen.getByRole('checkbox', { name: 'Design' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Engineering' }).getAttribute('aria-checked')).toBe('false');
  });

  it('renders a single checkbox for a CHECKBOX property', () => {
    renderField({ key: 'blocked', label: 'Blocked', options: null, required: false, type: 'CHECKBOX' }, true);
    expect(screen.getByRole('checkbox', { name: 'Blocked' }).getAttribute('aria-checked')).toBe('true');
  });

  it('renders a date input for a DATE property', () => {
    renderField({ key: 'dueDate', label: 'Due date', options: null, required: false, type: 'DATE' }, '2026-08-05');
    expect(screen.getByLabelText('Due date')).toHaveProperty('type', 'date');
  });

  it('renders a number input for a NUMBER property', () => {
    renderField({ key: 'estimate', label: 'Estimate', options: null, required: false, type: 'NUMBER' }, 3);
    expect(screen.getByLabelText('Estimate')).toHaveProperty('type', 'number');
  });

  it('renders a text input for a RICH_TEXT property', () => {
    renderField({ key: 'summary', label: 'Summary', options: null, required: false, type: 'RICH_TEXT' }, 'note');
    expect(screen.getByLabelText('Summary')).toHaveProperty('type', 'text');
  });

  it('renders a person picker showing the assignee name for a PERSON property', () => {
    renderField(
      { key: 'assignee', label: 'Assignee', options: null, required: false, type: 'PERSON' },
      '11111111-1111-4111-8111-111111111111',
      [
        { email: 'ada@example.com', id: '11111111-1111-4111-8111-111111111111', name: 'Ada Lovelace' },
        { email: 'grace@example.com', id: '22222222-2222-4222-8222-222222222222', name: 'Grace Hopper' },
      ],
    );
    expect(screen.getByRole('combobox', { name: 'Assignee' })).toBeDefined();
    expect(screen.getByText('Ada Lovelace')).toBeDefined();
  });

  it('degrades honestly when a PERSON value does not match any known member', () => {
    renderField(
      { key: 'assignee', label: 'Assignee', options: null, required: false, type: 'PERSON' },
      '99999999-9999-4999-8999-999999999999',
      [{ email: 'ada@example.com', id: '11111111-1111-4111-8111-111111111111', name: 'Ada Lovelace' }],
    );
    expect(screen.getByText('Unknown member')).toBeDefined();
  });

  it('shows a muted placeholder instead of an empty box for an unset text property', () => {
    renderField({ key: 'summary', label: 'Summary', options: null, required: false, type: 'RICH_TEXT' }, undefined);
    expect(screen.getByLabelText('Summary')).toHaveProperty('placeholder', 'Empty');
  });
});
