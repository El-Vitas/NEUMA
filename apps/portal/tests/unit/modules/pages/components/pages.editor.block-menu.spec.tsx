import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorBlockMenu } from '@/modules/pages/components/pages.editor.block-menu';
import type { PageEditorBlockConversion } from '@/modules/pages/types/pages.editor.convert.types';
import es from '../../../../../messages/es.json';

const conversion: PageEditorBlockConversion = { id: 'heading1', labelKey: 'heading1', losesContent: false };

interface MenuUse {
  readonly becamePage: number[];
  readonly closed: number[];
  readonly commented: number[];
  readonly copied: number[];
  readonly deleted: number[];
  readonly duplicated: number[];
  readonly moved: number[];
  readonly painted: string[];
}

const showMenu = (conversions: readonly PageEditorBlockConversion[] = [conversion], hasIdentity = true): MenuUse => {
  const use: MenuUse = {
    becamePage: [],
    closed: [],
    commented: [],
    copied: [],
    deleted: [],
    duplicated: [],
    moved: [],
    painted: [],
  };
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PagesEditorBlockMenu
        calloutIcon={null}
        canBecomePage
        colors={{ background: null, text: null }}
        conversions={conversions}
        folding={null}
        hasIdentity={hasIdentity}
        imageAlign={null}
        onBecomePage={() => use.becamePage.push(1)}
        onCalloutIcon={() => undefined}
        onClose={() => use.closed.push(1)}
        onColor={(kind, color) => use.painted.push(`${kind}:${String(color)}`)}
        onComment={() => use.commented.push(1)}
        onConvert={() => undefined}
        onCopyLink={() => use.copied.push(1)}
        onDelete={() => use.deleted.push(1)}
        onDuplicate={() => use.duplicated.push(1)}
        onImageAlign={() => undefined}
        onMoveToPage={() => use.moved.push(1)}
        onTableAction={() => undefined}
        tableActions={false}
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

  it('offers copying its link, moving it to another page and commenting it', () => {
    showMenu();

    expect(screen.getByRole('menuitem', { name: 'Copiar enlace' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Mover a…' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Comentar' })).toBeDefined();
  });

  it('leaves out copying a link for a block that has no identity yet', () => {
    showMenu([conversion], false);

    expect(screen.queryByRole('menuitem', { name: 'Copiar enlace' })).toBeNull();
  });

  it('turns the block into a page of its own when asked', () => {
    const use = showMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Convertir en página' }));

    expect(use.becamePage.length).toBe(1);
  });

  it('offers a colour for the text and one for the background', () => {
    showMenu();

    expect(screen.getByRole('menuitem', { name: 'Color del texto' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Color de fondo' })).toBeDefined();
  });

  it('closes on Escape', () => {
    const use = showMenu();

    fireEvent.keyDown(document.activeElement ?? document.body, { code: 'Escape', key: 'Escape' });

    expect(use.closed.length).toBeGreaterThan(0);
  });
});
