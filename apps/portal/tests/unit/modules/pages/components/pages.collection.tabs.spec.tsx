import { describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
}));

const { PagesCollectionTabs } = await import('@/modules/pages/collections/components/pages.collection.tabs');

const table: PageSchemaView = { configuration: { icon: '📋' }, isDefault: true, name: 'Table', type: 'TABLE' };
const board: PageSchemaView = { configuration: {}, isDefault: false, name: 'Board', type: 'BOARD' };

describe('PagesCollectionTabs', () => {
  it('marks the view being looked at', () => {
    cleanup();
    render(<PagesCollectionTabs activeViewName="Board" label="Vistas" views={[table, board]} />);

    expect(screen.getByRole('link', { name: 'Board' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Table/ }).getAttribute('aria-current')).toBeNull();
  });

  it('draws the emoji of a view that chose one, next to its name', () => {
    cleanup();
    render(<PagesCollectionTabs activeViewName="Table" label="Vistas" views={[table, board]} />);

    expect(screen.getByRole('link', { name: /Table/ }).textContent).toBe('📋Table');
    expect(screen.getByRole('link', { name: 'Board' }).textContent).toBe('Board');
  });
});
