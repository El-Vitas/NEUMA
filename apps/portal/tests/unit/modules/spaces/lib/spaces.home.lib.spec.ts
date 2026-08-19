import { describe, expect, it } from 'bun:test';
import { selectSpaceHomeActivity, selectSpaceHomeMainPages } from '@/modules/spaces/lib/spaces.home.lib';
import type { SpaceHomeActivity } from '@/modules/spaces/types/spaces.home.types';

const buildActivity = (id: string, editedAt: string): SpaceHomeActivity => ({
  editedAt: new Date(editedAt),
  editedBy: 'Jane Doe',
  icon: null,
  id,
  title: id,
});

describe('what a space shows at its entrance', () => {
  it('stops showing pages before the entrance turns into a list', () => {
    const pages = Array.from({ length: 30 }, (_, at) => ({ icon: null, id: `page-${at}`, title: `Page ${at}` }));

    expect(selectSpaceHomeMainPages(pages)).toHaveLength(12);
  });

  it('shows everything when there is little to show', () => {
    const pages = [{ icon: null, id: 'page-1', title: 'Handbook' }];

    expect(selectSpaceHomeMainPages(pages)).toEqual(pages);
  });

  /** What moved last is what somebody arriving is looking for, so it is read newest first. */
  it('puts the latest writing first', () => {
    const activity = [
      buildActivity('older', '2026-01-01T00:00:00.000Z'),
      buildActivity('newest', '2026-08-01T00:00:00.000Z'),
      buildActivity('middle', '2026-04-01T00:00:00.000Z'),
    ];

    expect(selectSpaceHomeActivity(activity).map((entry) => entry.id)).toEqual(['newest', 'middle', 'older']);
  });

  it('leaves the list it was given alone', () => {
    const activity = [
      buildActivity('older', '2026-01-01T00:00:00.000Z'),
      buildActivity('newest', '2026-08-01T00:00:00.000Z'),
    ];

    selectSpaceHomeActivity(activity);

    expect(activity.map((entry) => entry.id)).toEqual(['older', 'newest']);
  });

  it('keeps the recent list short enough to read at a glance', () => {
    const activity = Array.from({ length: 20 }, (_, at) =>
      buildActivity(`page-${at}`, `2026-01-${String(at + 1).padStart(2, '0')}T00:00:00.000Z`),
    );

    expect(selectSpaceHomeActivity(activity)).toHaveLength(8);
  });
});
