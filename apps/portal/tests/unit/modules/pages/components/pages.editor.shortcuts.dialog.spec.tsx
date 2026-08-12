import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorShortcutsDialog } from '@/modules/pages/components/pages.editor.shortcuts.dialog';
import { PAGE_EDITOR_SHORTCUTS } from '@/modules/pages/constants/pages.editor.shortcuts.constants';
import en from '../../../../../messages/en.json';

const renderDialog = (usesCommandKey = false) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesEditorShortcutsDialog usesCommandKey={usesCommandKey} />
    </NextIntlClientProvider>,
  );

describe('the shortcut list of the editor', () => {
  it('offers a way in', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: en.pages.openShortcuts })).toBeDefined();
  });

  it('lists every shortcut the editor binds, so none is kept secret', async () => {
    renderDialog();

    screen.getByRole('button', { name: en.pages.openShortcuts }).click();

    for (const shortcut of PAGE_EDITOR_SHORTCUTS) {
      const label = en.pages.shortcuts[shortcut.labelKey as keyof typeof en.pages.shortcuts];
      expect(await screen.findByText(label)).toBeDefined();
    }
  });

  it('shows the keys of moving a block up and down', async () => {
    renderDialog();

    screen.getByRole('button', { name: en.pages.openShortcuts }).click();
    const keys = (await screen.findAllByText('↑')).concat(await screen.findAllByText('↓'));

    expect(keys.length).toBe(2);
    expect((await screen.findAllByText('Shift')).length).toBeGreaterThan(0);
  });
});
