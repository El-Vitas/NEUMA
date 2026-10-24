import { describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { buildView } from '../lib/pages.views.fixture';

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
}));

const { PagesCollectionTabs } = await import('@/modules/pages/collections/components/pages.collection.tabs');

const table = buildView('Table', 'TABLE', { configuration: { icon: '📋' }, isDefault: true });
const board = buildView('Board', 'BOARD');

describe('PagesCollectionTabs', () => {
  it('marks the view being looked at', () => {
    cleanup();
    render(<PagesCollectionTabs activeViewName="Board" label="Vistas" views={[table, board]} />);

    expect(screen.getByRole('link', { name: 'Board' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Table/ }).getAttribute('aria-current')).toBeNull();
  });

  it('keeps the words searched when another view is opened', () => {
    cleanup();
    render(<PagesCollectionTabs activeViewName="Table" label="Vistas" search="informe anual" views={[table, board]} />);

    expect(screen.getByRole('link', { name: 'Board' }).getAttribute('href')).toBe('?view=Board&q=informe+anual');
  });

  it('opens a view with no words when none were searched', () => {
    cleanup();
    render(<PagesCollectionTabs activeViewName="Table" label="Vistas" views={[table, board]} />);

    expect(screen.getByRole('link', { name: 'Board' }).getAttribute('href')).toBe('?view=Board');
  });

  it('draws the emoji of a view that chose one, next to its name', () => {
    cleanup();
    render(<PagesCollectionTabs activeViewName="Table" label="Vistas" views={[table, board]} />);

    expect(screen.getByRole('link', { name: /Table/ }).textContent).toBe('📋Table');
    expect(screen.getByRole('link', { name: 'Board' }).textContent).toBe('Board');
  });
});
