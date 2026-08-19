import { describe, expect, it } from 'bun:test';
import { validatePageIcon } from '@/modules/pages/domain/page-icon.domain';

describe('validatePageIcon', () => {
  it('accepts null as clearing the icon', () => {
    const result = validatePageIcon(null);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('accepts a well-formed emoji icon', () => {
    const result = validatePageIcon({ kind: 'emoji', value: '🚀' });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ kind: 'emoji', value: '🚀' });
  });

  it('accepts a well-formed image icon', () => {
    const result = validatePageIcon({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', kind: 'image' });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', kind: 'image' });
  });

  it('rejects an empty emoji value', () => {
    const result = validatePageIcon({ kind: 'emoji', value: '' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ICON_INVALID');
  });

  it('rejects an emoji value longer than the allowed length', () => {
    const result = validatePageIcon({ kind: 'emoji', value: 'x'.repeat(32) });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ICON_INVALID');
  });

  it('rejects an image icon with a non-uuid assetId', () => {
    const result = validatePageIcon({ assetId: 'not-a-uuid', kind: 'image' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ICON_INVALID');
  });

  it('rejects an unknown icon kind', () => {
    const result = validatePageIcon({ kind: 'sticker', value: '🚀' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ICON_INVALID');
  });
});
