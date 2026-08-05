import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { PagePropertyValue, PageSchemaProperty } from '@/modules/pages/types/pages.schema.types';

const { PagesPropertiesField } = await import('@/modules/pages/components/pages.properties.field');

const renderField = (property: PageSchemaProperty, value: PagePropertyValue | undefined) =>
  render(<PagesPropertiesField disabled={false} onChange={mock(() => undefined)} property={property} value={value} />);

describe('PagesPropertiesField', () => {
  it('renders a select trigger for a SELECT property', () => {
    renderField(
      { key: 'status', label: 'Status', options: ['todo', 'done'], required: true, type: 'SELECT' },
      undefined,
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDefined();
  });

  it('renders a checkbox per option for a MULTI_SELECT property', () => {
    renderField(
      { key: 'team', label: 'Team', options: ['design', 'engineering'], required: false, type: 'MULTI_SELECT' },
      ['design'],
    );
    expect(screen.getByRole('checkbox', { name: 'design' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'engineering' }).getAttribute('aria-checked')).toBe('false');
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

  it('renders a text input for a PERSON property', () => {
    renderField({ key: 'assignee', label: 'Assignee', options: null, required: false, type: 'PERSON' }, undefined);
    expect(screen.getByLabelText('Assignee')).toHaveProperty('type', 'text');
  });
});
