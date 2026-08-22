import { beforeEach, describe, expect, it } from 'bun:test';
import { isTheWritingStillInHand } from '@/modules/pages/editor/lib/pages.editor.attention.lib';

const buildSurface = (): HTMLElement => {
  const surface = document.createElement('div');
  surface.append(document.createElement('p'));
  document.body.append(surface);
  return surface;
};

const buildMenu = (): HTMLElement => {
  const menu = document.createElement('div');
  menu.setAttribute('data-slot', 'dropdown-menu-content');
  menu.append(document.createElement('button'));
  document.body.append(menu);
  return menu;
};

describe('isTheWritingStillInHand', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the writing in hand while what took the focus belongs to the page itself', () => {
    const surface = buildSurface();

    expect(isTheWritingStillInHand(surface.firstElementChild, surface)).toBe(true);
  });

  it('keeps it while a menu the writing opened is holding the focus', () => {
    const surface = buildSurface();
    const menu = buildMenu();

    expect(isTheWritingStillInHand(menu.firstElementChild, surface)).toBe(true);
  });

  it('lets it go once the focus lands somewhere else on the page', () => {
    const surface = buildSurface();
    const elsewhere = document.createElement('input');
    document.body.append(elsewhere);

    expect(isTheWritingStillInHand(elsewhere, surface)).toBe(false);
  });

  it('keeps it when the window itself was left, since nobody went anywhere else', () => {
    const surface = buildSurface();

    expect(isTheWritingStillInHand(null, surface)).toBe(true);
  });
});
