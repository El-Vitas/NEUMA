import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorSlashMenu } from '@/modules/pages/editor/menus/components/pages.editor.slash-menu';
import { buildSlashMenuOptionId } from '@/modules/pages/editor/menus/lib/pages.editor.slash-menu.lib';
import type { PagesEditorMenuItem } from '@/modules/pages/editor/menus/types/pages.editor.slash-menu.types';
import es from '../../../../../messages/es.json';

const runCommand = () => true;

const buildMenuItem = (id: string, label: string, group?: PagesEditorMenuItem['group']): PagesEditorMenuItem => ({
  group,
  id,
  label,
  run: runCommand,
});

const menuItems: readonly PagesEditorMenuItem[] = [
  buildMenuItem('heading', 'Título', 'text'),
  buildMenuItem('bulletList', 'Lista', 'lists'),
  buildMenuItem('table', 'Tabla'),
];

const renderMenu = (id: string, label: string, selectedIndex: number) =>
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PagesEditorSlashMenu
        emptyMessage="Sin resultados"
        id={id}
        items={menuItems}
        label={label}
        onSelect={() => undefined}
        selectedIndex={selectedIndex}
      />
    </NextIntlClientProvider>,
  );

describe('the ids the slash menu exposes for a listener elsewhere to address it', () => {
  it('gives the listbox the id it is asked for and builds every option id from it', () => {
    renderMenu('menu-one', 'Comandos', 0);

    const listbox = screen.getByRole('listbox', { name: 'Comandos' });
    const selectedOption = screen.getByRole('option', { name: 'Título' });

    expect(listbox.id).toBe('menu-one');
    expect(selectedOption.id).toBe(buildSlashMenuOptionId('menu-one', 'heading'));
  });

  it('builds every grouped and ungrouped option id the same way', () => {
    renderMenu('menu-one', 'Comandos', 0);

    expect(screen.getByRole('option', { name: 'Lista' }).id).toBe(buildSlashMenuOptionId('menu-one', 'bulletList'));
    expect(screen.getByRole('option', { name: 'Tabla' }).id).toBe(buildSlashMenuOptionId('menu-one', 'table'));
  });

  it('keeps option ids unique across two menus mounted at the same time', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <PagesEditorSlashMenu
          emptyMessage="Sin resultados"
          id="menu-a"
          items={menuItems}
          label="Comandos uno"
          onSelect={() => undefined}
          selectedIndex={0}
        />
        <PagesEditorSlashMenu
          emptyMessage="Sin resultados"
          id="menu-b"
          items={menuItems}
          label="Comandos dos"
          onSelect={() => undefined}
          selectedIndex={0}
        />
      </NextIntlClientProvider>,
    );

    const [firstOption, secondOption] = screen.getAllByRole('option', { name: 'Título' });

    expect(firstOption?.id).toBe(buildSlashMenuOptionId('menu-a', 'heading'));
    expect(secondOption?.id).toBe(buildSlashMenuOptionId('menu-b', 'heading'));
    expect(firstOption?.id).not.toBe(secondOption?.id);
  });

  it('still gives every option a stable, unique id when no id prop is supplied', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <PagesEditorSlashMenu
          emptyMessage="Sin resultados"
          items={menuItems}
          label="Comandos uno"
          onSelect={() => undefined}
          selectedIndex={0}
        />
        <PagesEditorSlashMenu
          emptyMessage="Sin resultados"
          items={menuItems}
          label="Comandos dos"
          onSelect={() => undefined}
          selectedIndex={0}
        />
      </NextIntlClientProvider>,
    );

    const [firstOption, secondOption] = screen.getAllByRole('option', { name: 'Título' });

    expect(firstOption?.id).toBeTruthy();
    expect(secondOption?.id).toBeTruthy();
    expect(firstOption?.id).not.toBe(secondOption?.id);
  });
});
