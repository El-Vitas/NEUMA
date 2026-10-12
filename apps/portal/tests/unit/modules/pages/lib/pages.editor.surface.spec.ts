import { describe, expect, it } from 'bun:test';
import { PAGE_EDITOR_QUIET_SURFACE } from '@/modules/pages/editor/menus/constants/pages.editor.surface.constants';
import { keepPageEditorSurfaceIfSame } from '@/modules/pages/editor/menus/lib/pages.editor.surface.lib';

describe('keepPageEditorSurfaceIfSame', () => {
  it('keeps what was there when nothing the editor shows changed', () => {
    const again = { ...PAGE_EDITOR_QUIET_SURFACE, marksInUse: [...PAGE_EDITOR_QUIET_SURFACE.marksInUse] };

    expect(keepPageEditorSurfaceIfSame(PAGE_EDITOR_QUIET_SURFACE, again)).toBe(PAGE_EDITOR_QUIET_SURFACE);
  });

  it('takes the new one when something it shows changed', () => {
    const changed = { ...PAGE_EDITOR_QUIET_SURFACE, isInTable: !PAGE_EDITOR_QUIET_SURFACE.isInTable };

    expect(keepPageEditorSurfaceIfSame(PAGE_EDITOR_QUIET_SURFACE, changed)).toBe(changed);
  });
});
