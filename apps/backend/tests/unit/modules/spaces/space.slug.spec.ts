import { describe, expect, it } from 'bun:test';
import { buildPrivateSpaceSlug, isSpaceSlugAvailableToAsk } from '@/modules/spaces/utils/space.utils';

describe('isSpaceSlugAvailableToAsk', () => {
  it('lets an ordinary space be called what it wants', () => {
    expect(isSpaceSlugAvailableToAsk('ingenieria')).toBe(true);
    expect(isSpaceSlugAvailableToAsk('ventas-2026')).toBe(true);
  });

  /**
   * Every person's own area lives at a name built from their identifier, and it
   * is made without reading first. Somebody who takes that name leaves its
   * owner without an area and nothing says so out loud.
   */
  it('refuses the name where somebody else keeps their own area', () => {
    expect(isSpaceSlugAvailableToAsk(buildPrivateSpaceSlug('user-a'))).toBe(false);
    expect(isSpaceSlugAvailableToAsk('private-anything')).toBe(false);
  });
});
