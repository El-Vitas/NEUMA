import { describe, expect, it } from 'bun:test';
import { validatePageCover } from '@/modules/pages/domain/page-cover.domain';

const ASSET_ID = '019ff3f9-2bc6-7373-9f81-f4469fa28a36';

describe('validatePageCover', () => {
  it('accepts null as clearing the cover', () => {
    const result = validatePageCover(null);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('accepts a picture framed somewhere inside itself', () => {
    const result = validatePageCover({ assetId: ASSET_ID, position: 40 });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ assetId: ASSET_ID, position: 40 });
  });

  it('accepts both edges of the framing', () => {
    expect(validatePageCover({ assetId: ASSET_ID, position: 0 }).isOk()).toBe(true);
    expect(validatePageCover({ assetId: ASSET_ID, position: 100 }).isOk()).toBe(true);
  });

  it('rejects a framing outside the picture', () => {
    const result = validatePageCover({ assetId: ASSET_ID, position: 140 });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_COVER_INVALID');
  });

  it('rejects a cover pointing at something that is not an asset', () => {
    const result = validatePageCover({ assetId: 'not-an-asset', position: 50 });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_COVER_INVALID');
  });

  it('rejects a cover with no framing at all', () => {
    const result = validatePageCover({ assetId: ASSET_ID });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_COVER_INVALID');
  });
});
