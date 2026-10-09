import { describe, expect, it } from 'bun:test';
import { PORTAL_SIDEBAR_ROW_NESTING_BAND } from '@/modules/portal/constants/portal.sidebar.drag.constants';
import { readPortalSidebarDropIntent } from '@/modules/portal/lib/portal.sidebar.drag.lib';

// The pointer measurements below assume this row position.
const row = { height: 20, top: 100 } as const;

describe('readPortalSidebarDropIntent', () => {
  it('nests when the pointer is over the body of the row, which is what a row mostly is', () => {
    expect(readPortalSidebarDropIntent(row, 110)).toBe('nest');
  });

  it('sets the page above when the pointer rests on the row upper edge', () => {
    expect(readPortalSidebarDropIntent(row, row.top + 1)).toBe('before');
  });

  it('sets the page below when the pointer rests on the row lower edge', () => {
    expect(readPortalSidebarDropIntent(row, row.top + row.height - 1)).toBe('after');
  });

  it('keeps the edges narrower than the body, so nesting stays the easy thing to do', () => {
    expect(PORTAL_SIDEBAR_ROW_NESTING_BAND).toBeGreaterThan(0.5);
  });
});
