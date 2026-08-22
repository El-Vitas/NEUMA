import { describe, expect, it } from 'bun:test';
import { PAGE_EDITOR_SHORTCUTS } from '@/modules/pages/editor/menus/constants/pages.editor.shortcuts.constants';
import {
  createPageEditorShortcutBindings,
  readPageEditorShortcutKeys,
} from '@/modules/pages/editor/menus/lib/pages.editor.shortcuts.lib';
import en from '../../../../../messages/en.json';
import es from '../../../../../messages/es.json';

const findShortcut = (labelKey: string) => {
  const shortcut = PAGE_EDITOR_SHORTCUTS.find((candidate) => candidate.labelKey === labelKey);
  if (shortcut === undefined) throw new Error(`shortcut "${labelKey}" is missing`);
  return shortcut;
};

describe('the shortcuts the editor answers to', () => {
  it('offers one for lifting a block and one for dropping it', () => {
    expect(findShortcut('moveBlockUp').binding).toBe('Mod-Shift-ArrowUp');
    expect(findShortcut('moveBlockDown').binding).toBe('Mod-Shift-ArrowDown');
  });

  it('binds every shortcut it lists, so reading one is the same as having it', () => {
    const bindings = createPageEditorShortcutBindings(PAGE_EDITOR_SHORTCUTS);

    expect(Object.keys(bindings).length).toBe(PAGE_EDITOR_SHORTCUTS.length);
    for (const shortcut of PAGE_EDITOR_SHORTCUTS) {
      expect(bindings[shortcut.binding]).toBe(shortcut.run);
    }
  });

  it('says what each one does in both languages', () => {
    for (const shortcut of PAGE_EDITOR_SHORTCUTS) {
      expect(es.pages.shortcuts).toHaveProperty(shortcut.labelKey);
      expect(en.pages.shortcuts).toHaveProperty(shortcut.labelKey);
    }
  });
});

describe('showing a shortcut to a person', () => {
  it('spells out the keys of the binding', () => {
    expect(readPageEditorShortcutKeys(findShortcut('moveBlockUp'), false).keys).toEqual(['Ctrl', 'Shift', '↑']);
    expect(readPageEditorShortcutKeys(findShortcut('moveBlockDown'), false).keys).toEqual(['Ctrl', 'Shift', '↓']);
  });

  it('names the modifier the way the keyboard does', () => {
    expect(readPageEditorShortcutKeys(findShortcut('undo'), true).keys).toEqual(['⌘', 'Z']);
    expect(readPageEditorShortcutKeys(findShortcut('undo'), false).keys).toEqual(['Ctrl', 'Z']);
  });

  it('leaves a plain key as it is', () => {
    expect(readPageEditorShortcutKeys(findShortcut('indentBlock'), false).keys).toEqual(['Tab']);
    expect(readPageEditorShortcutKeys(findShortcut('selectBlock'), false).keys).toEqual(['Esc']);
  });
});
