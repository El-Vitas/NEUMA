import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorTurnIntoMenu } from '@/modules/pages/editor/blocks/components/pages.editor.turn-into.menu';
import type { PageEditorBlockConversion } from '@/modules/pages/editor/blocks/types/pages.editor.convert.types';
import es from '../../../../../messages/es.json';

const safeConversion: PageEditorBlockConversion = { id: 'heading1', labelKey: 'heading1', losesContent: false };

const lossyConversion: PageEditorBlockConversion = { id: 'codeBlock', labelKey: 'codeBlock', losesContent: true };

const showMenu = (
  conversions: readonly PageEditorBlockConversion[],
): { readonly converted: string[]; readonly container: HTMLElement } => {
  const converted: string[] = [];
  const { container } = render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PagesEditorTurnIntoMenu conversions={conversions} onConvert={(targetId) => converted.push(targetId)} />
    </NextIntlClientProvider>,
  );
  return { container, converted };
};

const openMenu = (): void => {
  fireEvent.pointerDown(
    screen.getByRole('button', { name: 'Convertir en' }),
    new PointerEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }),
  );
};

describe('offering the types a block can become', () => {
  it('stays out of the way when the block cannot become anything', () => {
    const { container } = showMenu([]);

    expect(container.textContent).toBe('');
  });

  it('names each type it offers', () => {
    showMenu([safeConversion, lossyConversion]);

    openMenu();

    expect(screen.getByRole('menuitem', { name: /Encabezado 1/ })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Bloque de código/ })).toBeDefined();
  });

  it('converts right away when nothing would be lost', () => {
    const { converted } = showMenu([safeConversion]);

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Encabezado 1/ }));

    expect(converted).toEqual(['heading1']);
  });

  it('asks first when the conversion would leave something behind', () => {
    const { converted } = showMenu([lossyConversion]);

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Bloque de código/ }));

    expect(converted).toEqual([]);
    expect(screen.getByText('Esta conversión pierde contenido')).toBeDefined();
  });

  it('converts once the warning is accepted', () => {
    const { converted } = showMenu([lossyConversion]);

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Bloque de código/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Convertir igual' }));

    expect(converted).toEqual(['codeBlock']);
  });

  it('leaves the block alone when the warning is dismissed', () => {
    const { converted } = showMenu([lossyConversion]);

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Bloque de código/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(converted).toEqual([]);
    expect(screen.queryByText('Esta conversión pierde contenido')).toBeNull();
  });
});
