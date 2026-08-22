import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesIconMenu } from '@/modules/pages/appearance/components/pages.icon.menu';
import en from '../../../../../messages/en.json';

const renderMenu = (overrides: Partial<Parameters<typeof PagesIconMenu>[0]> = {}) => {
  const calls = { emoji: [] as string[], randomEmoji: 0, randomSymbol: 0, remove: 0, uploaded: [] as File[] };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesIconMenu
        hasIcon={false}
        isPending={false}
        onChooseEmoji={(value) => calls.emoji.push(value)}
        onChooseSymbol={() => undefined}
        onRandomEmoji={() => {
          calls.randomEmoji += 1;
        }}
        onRandomSymbol={() => {
          calls.randomSymbol += 1;
        }}
        onRemove={() => {
          calls.remove += 1;
        }}
        onUpload={(file) => calls.uploaded.push(file)}
        symbolColor="default"
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
  return calls;
};

describe('PagesIconMenu', () => {
  it('narrows the emoji grid as the reader types a search', () => {
    renderMenu();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search by name' }), { target: { value: 'rocket' } });

    expect(screen.getByRole('button', { name: /rocket/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /grinning/ })).toBeNull();
  });

  it('reports the chosen emoji character', () => {
    const calls = renderMenu();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search by name' }), { target: { value: 'rocket' } });
    fireEvent.click(screen.getByRole('button', { name: /rocket/ }));

    expect(calls.emoji).toEqual(['🚀']);
  });

  it('takes chance from whichever drawer is open, asking for an emoji while the emoji tab is', () => {
    const calls = renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Random icon' }));

    expect(calls.randomEmoji).toBe(1);
    expect(calls.randomSymbol).toBe(0);
  });

  it('asks for a random symbol instead once the icons tab is the one open', () => {
    const calls = renderMenu();

    const iconsTab = screen.getByRole('tab', { name: 'Icons' });
    fireEvent.mouseDown(iconsTab, { bubbles: true, button: 0 });
    fireEvent.click(iconsTab);

    expect(iconsTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Random icon' }));

    expect(calls.randomSymbol).toBe(1);
    expect(calls.randomEmoji).toBe(0);
  });

  it('reports the uploaded file', () => {
    const calls = renderMenu();
    const file = new File(['content'], 'icon.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Upload an image'), { target: { files: [file] } });

    expect(calls.uploaded).toEqual([file]);
  });

  it('hides the remove option when there is no icon yet', () => {
    renderMenu({ hasIcon: false });

    expect(screen.queryByRole('button', { name: 'Remove icon' })).toBeNull();
  });

  it('offers to remove an existing icon', () => {
    const calls = renderMenu({ hasIcon: true });

    fireEvent.click(screen.getByRole('button', { name: 'Remove icon' }));

    expect(calls.remove).toBe(1);
  });

  it('disables every action while a change is pending', () => {
    renderMenu({ hasIcon: true, isPending: true });

    expect(screen.getByRole('button', { name: 'Upload an image' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Random icon' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Remove icon' })).toHaveProperty('disabled', true);
  });
});
