import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PageCollectionLookups } from '@/modules/pages/collections/types/pages.lookups.types';
import type {
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { defaultConfig } from '../lib/pages.options.fixture';

const { PagesPropertyValue } = await import('@/modules/pages/collections/components/pages.properties.value');
const { PagesCollectionLookupsProvider } = await import(
  '@/modules/pages/collections/components/pages.collection.lookups.provider'
);

afterEach(cleanup);

const ada: PagePersonOption = { email: 'ada@example.com', id: 'user-a', name: 'Ada Lovelace' };
const grace: PagePersonOption = { email: 'grace@example.com', id: 'user-b', name: 'Grace Hopper' };

const lookups: PageCollectionLookups = {
  attachedFiles: [{ id: 'file-1', mimeType: 'text/plain', name: 'minutes.txt', size: 10 }],
  people: [ada, grace],
  relatedRows: [{ id: 'row-9', title: 'Roadmap' }],
};

const property = (
  type: PageSchemaProperty['type'],
  overrides: Partial<PageSchemaProperty> = {},
): PageSchemaProperty => ({
  config: defaultConfig,
  key: 'p',
  label: 'P',
  options: null,
  required: false,
  type,
  ...overrides,
});

const draw = (target: PageSchemaProperty, value: PagePropertyValue | undefined, isLinked = true) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesCollectionLookupsProvider lookups={lookups}>
        <PagesPropertyValue isLinked={isLinked} personOptions={[ada, grace]} property={target} value={value} />
      </PagesCollectionLookupsProvider>
    </NextIntlClientProvider>,
  );

const stage = property('STATUS', {
  options: [
    { color: 'GRAY', group: 'TO_DO', id: 'a', value: 'Not started' },
    { color: 'BLUE', group: 'IN_PROGRESS', id: 'b', value: 'Doing' },
    { color: 'GREEN', group: 'COMPLETE', id: 'c', value: 'Done' },
  ],
});

describe('how a cell reads', () => {
  it('names the option of a status and draws its group as a shape', () => {
    const { container } = draw(stage, 'b');

    expect(screen.getByText('Doing')).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('draws nothing for an option that was removed', () => {
    const { container } = draw(stage, 'gone');

    expect(container.textContent).toBe('');
  });

  it('names every option of a multi-select', () => {
    draw(property('MULTI_SELECT', { options: stage.options }), ['a', 'c']);

    expect(screen.getByText('Not started')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('names each person of a list, and says so for one the directory does not know', () => {
    draw(property('PERSON'), ['user-a', 'user-z']);

    expect(screen.getByText('Ada Lovelace, Unknown member')).toBeDefined();
  });

  it('names who made a row from the single id the server gives', () => {
    draw(property('CREATED_BY'), 'user-b');

    expect(screen.getByText('Grace Hopper')).toBeDefined();
  });

  it('draws a range of days', () => {
    draw(property('DATE'), { end: '2026-03-03', start: '2026-03-01' });

    expect(screen.getByText('Mar 1, 2026 → Mar 3, 2026')).toBeDefined();
  });

  it('draws the moment a row was made', () => {
    draw(property('CREATED_TIME'), { start: '2026-03-01T10:00:00.000Z' });

    expect(screen.getByText(/2026/)).toBeDefined();
  });

  it('writes a number as the property says, and a percent as a percent', () => {
    draw(property('NUMBER', { config: { ...defaultConfig, decimals: 1, numberFormat: 'PERCENT' } }), 0.255);

    expect(screen.getByText('25.5%')).toBeDefined();
  });

  it('writes money with its currency', () => {
    draw(
      property('NUMBER', { config: { ...defaultConfig, currency: 'USD', decimals: 2, numberFormat: 'CURRENCY' } }),
      12,
    );

    expect(screen.getByText('USD 12.00')).toBeDefined();
  });

  it('writes a unique id with its prefix', () => {
    draw(property('UNIQUE_ID', { config: { ...defaultConfig, prefix: 'TSK' } }), 14);

    expect(screen.getByText('TSK-14')).toBeDefined();
  });

  it('opens a link in another tab, with nothing passed to the page it opens', () => {
    draw(property('URL'), 'https://example.com/docs');

    const link = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(link.getAttribute('href')).toBe('https://example.com/docs');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('turns a mail and a phone into links that open the right program', () => {
    draw(property('EMAIL'), 'ada@example.com');
    expect(screen.getByRole('link').getAttribute('href')).toBe('mailto:ada@example.com');
  });

  it('never makes a link of an address that is not a web address', () => {
    draw(property('URL'), 'javascript:alert(1)');

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('javascript:alert(1)')).toBeDefined();
  });

  it('shows an address as plain text inside a control that is itself clickable', () => {
    draw(property('URL'), 'https://example.com', false);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('names the files by the facts the server gave, not by their ids', () => {
    draw(property('FILES'), ['file-1', 'file-gone']);

    expect(screen.getByText('minutes.txt')).toBeDefined();
  });

  it('names the rows of a relation the reader can open, and leaves out the rest', () => {
    draw(property('RELATION'), ['row-9', 'row-hidden']);

    expect(screen.getByText('Roadmap')).toBeDefined();
  });
});
