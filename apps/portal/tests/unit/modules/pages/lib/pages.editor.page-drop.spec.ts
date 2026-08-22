import { afterEach, describe, expect, it } from 'bun:test';
import {
  findPageEditorPageDropTarget,
  markPageEditorPageDropTarget,
} from '@/modules/pages/editor/menus/lib/pages.editor.page-drop.lib';

/** A row of the page tree, as the sidebar draws it: the row says which page it stands for. */
const drawPageRow = (pageId: string): HTMLElement => {
  const row = document.createElement('div');
  row.setAttribute('data-page-drop-target', pageId);
  row.append(document.createElement('span'));
  document.body.append(row);
  return row;
};

const releaseOn = (element: Element): MouseEvent => {
  let release: MouseEvent | null = null;
  element.addEventListener('mouseup', (event) => {
    release = event as MouseEvent;
  });
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  if (release === null) throw new Error('the release was not reported');
  return release;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dropping blocks on the page tree', () => {
  it('reads which page the pointer is over, even from something drawn inside the row', () => {
    const row = drawPageRow('page-1');
    const inside = row.firstElementChild;
    if (inside === null) throw new Error('the row was not drawn');

    expect(findPageEditorPageDropTarget(releaseOn(inside))?.pageId).toBe('page-1');
  });

  it('reads no page when the pointer is somewhere else', () => {
    drawPageRow('page-1');
    const elsewhere = document.createElement('p');
    document.body.append(elsewhere);

    expect(findPageEditorPageDropTarget(releaseOn(elsewhere))).toBeNull();
  });

  it('shows where the blocks would land, on one row at a time', () => {
    const first = drawPageRow('page-1');
    const second = drawPageRow('page-2');

    markPageEditorPageDropTarget({ element: first, pageId: 'page-1' });
    markPageEditorPageDropTarget({ element: second, pageId: 'page-2' });

    expect(first.hasAttribute('data-page-drop-over')).toBe(false);
    expect(second.getAttribute('data-page-drop-over')).toBe('true');
  });

  it('stops showing it once the pointer is over nothing', () => {
    const row = drawPageRow('page-1');
    markPageEditorPageDropTarget({ element: row, pageId: 'page-1' });

    markPageEditorPageDropTarget(null);

    expect(row.hasAttribute('data-page-drop-over')).toBe(false);
  });
});
