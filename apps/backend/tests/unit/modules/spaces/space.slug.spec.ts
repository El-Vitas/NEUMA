import { describe, expect, it } from 'bun:test';
import { buildPrivateSpaceSlug, isSpaceSlugAvailableToAsk } from '@/modules/spaces/utils/space.utils';

describe('isSpaceSlugAvailableToAsk', () => {
  it('lets an ordinary space be called what it wants', () => {
    expect(isSpaceSlugAvailableToAsk('ingenieria')).toBe(true);
    expect(isSpaceSlugAvailableToAsk('ventas-2026')).toBe(true);
  });

  // A personal space slug is built from the user id and created without reading first: if someone else takes it,
  // the owner silently loses the space.
  it('refuses the name where somebody else keeps their own area', () => {
    expect(isSpaceSlugAvailableToAsk(buildPrivateSpaceSlug('user-a'))).toBe(false);
    expect(isSpaceSlugAvailableToAsk('private-anything')).toBe(false);
  });
});
