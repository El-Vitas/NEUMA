import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorBlockMenu } from '@/modules/pages/components/pages.editor.block-menu';
import type { PageEditorBlockConversion } from '@/modules/pages/types/pages.editor.convert.types';
import es from '../../../../../messages/es.json';

const conversion: PageEditorBlockConversion = { id: 'heading1', labelKey: 'heading1', losesContent: false };

interface MenuUse {
  readonly closed: number[];
  readonly deleted: number[];
  readonly duplicated: number[];
}

const showMenu = (conversions: readonly PageEditorBlockConversion[] = [conversion]): MenuUse => {
  const use: MenuUse = { closed: [], deleted: [], duplicated: [] };
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PagesEditorBlockMenu
        conversions={conversions}
        onClose={() => use.closed.push(1)}
        onConvert={() => undefined}
        onDelete={() => use.deleted.push(1)}
        onDuplicate={() => use.duplicated.push(1)}
      />
    </NextIntlClientProvider>,
  );
  return use;
};

describe('the actions a block offers', () => {
  it('opens showing what can be done to the block', () => {
    showMenu();

    expect(screen.getByRole('menuitem', { name: 'Duplicar' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Convertir en' })).toBeDefined();
  });

  it('leaves out becoming another type when this block cannot become one', () => {
    showMenu([]);

    expect(screen.queryByRole('menuitem', { name: 'Convertir en' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Duplicar' })).toBeDefined();
  });

  it('duplicates the block when asked', () => {
    const use = showMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicar' }));

    expect(use.duplicated.length).toBe(1);
  });

  it('deletes the block when asked', () => {
    const use = showMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));

    expect(use.deleted.length).toBe(1);
  });

  it('closes on Escape', () => {
    const use = showMenu();

    fireEvent.keyDown(document.activeElement ?? document.body, { code: 'Escape', key: 'Escape' });

    expect(use.closed.length).toBeGreaterThan(0);
  });
});
