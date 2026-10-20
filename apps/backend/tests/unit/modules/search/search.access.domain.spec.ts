import { describe, expect, test } from 'bun:test';
import { BLOCK_ROLE, type BlockViewer } from '@neuma/shared';
import { buildHeadingPath, canReadCandidate } from '@/modules/search/domain/search.access.domain';
import type { DeclaringAncestor } from '@/modules/search/types/search.types';

const viewer: BlockViewer = { userId: 'user-1', workspaceRole: 'WORKER' };

const grantTo = (userId: string, depth: number): DeclaringAncestor => ({
  depth,
  id: `declaring-${String(depth)}`,
  permissions: [{ principal: { kind: 'user', userId }, role: BLOCK_ROLE.editor }],
});

const grantToNobody = (depth: number): DeclaringAncestor => ({
  depth,
  id: `declaring-${String(depth)}`,
  permissions: [{ principal: { kind: 'user', userId: 'someone-else' }, role: BLOCK_ROLE.full }],
});

describe('canReadCandidate', () => {
  test('reads a block that no ancestor restricts', () => {
    expect(canReadCandidate(viewer, [])).toBe(true);
  });

  test('reads a block whose restricting ancestor grants the viewer', () => {
    expect(canReadCandidate(viewer, [grantTo('user-1', 1)])).toBe(true);
  });

  test('does not read a block whose restricting ancestor grants somebody else', () => {
    expect(canReadCandidate(viewer, [grantToNobody(1)])).toBe(false);
  });

  test('stays cut off from a branch even where a deeper block grants the viewer', () => {
    expect(canReadCandidate(viewer, [grantTo('user-1', 0), grantToNobody(2)])).toBe(false);
  });
});

describe('buildHeadingPath', () => {
  test('names nothing when no heading comes before', () => {
    expect(buildHeadingPath([])).toEqual([]);
  });

  test('nests a deeper heading under the one before it', () => {
    expect(
      buildHeadingPath([
        { level: 1, text: 'Setup' },
        { level: 2, text: 'Install' },
      ]),
    ).toEqual(['Setup', 'Install']);
  });

  test('drops a heading closed by a later one of the same or a higher level', () => {
    expect(
      buildHeadingPath([
        { level: 1, text: 'Setup' },
        { level: 2, text: 'Install' },
        { level: 2, text: 'Configure' },
        { level: 1, text: 'Usage' },
        { level: 3, text: 'Flags' },
      ]),
    ).toEqual(['Usage', 'Flags']);
  });
});
