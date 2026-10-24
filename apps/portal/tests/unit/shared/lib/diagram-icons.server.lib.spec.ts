import { describe, expect, it, mock } from 'bun:test';
import { DIAGRAM_BRAND_ICONS_NAME } from '@/shared/constants/diagram.constants';

mock.module('server-only', () => ({}));

const { readDiagramIcons } = await import('@/shared/server/lib/diagram-icons.server');

describe('readDiagramIcons', () => {
  it('serves a pack that exists', () => {
    expect(readDiagramIcons(DIAGRAM_BRAND_ICONS_NAME)).not.toBeNull();
  });

  it('knows nothing of names that only exist on every object', () => {
    expect(readDiagramIcons('constructor')).toBeNull();
    expect(readDiagramIcons('__proto__')).toBeNull();
    expect(readDiagramIcons('toString')).toBeNull();
  });
});
