import { describe, expect, it } from 'bun:test';
import { buildNewRowPropertyValues } from '@/modules/pages/collections/lib/pages.board-drag.lib';

describe('what a row created inside a column already holds', () => {
  it('is born with the value of the column it was created in', () => {
    expect(buildNewRowPropertyValues('status', 'doing')).toEqual({ status: 'doing' });
  });

  it('is born with nothing when it was created among the rows without a value', () => {
    expect(buildNewRowPropertyValues('status', 'unassigned')).toEqual({});
  });
});
