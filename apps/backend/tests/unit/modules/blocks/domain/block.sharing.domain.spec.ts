import { describe, expect, it } from 'bun:test';
import { BLOCK_ROLE, USER_ROLE } from '@neuma/shared';
import { listEntryUserIds, toAccessEntries, toAccessMembers } from '@/modules/blocks/domain/block.sharing.domain';

const ada = { email: 'ada@test.com', id: 'ada', name: 'Ada' };

describe('listEntryUserIds', () => {
  it('lists the people named, not the space', () => {
    const ids = listEntryUserIds([
      { principal: { kind: 'user', userId: 'ada' }, role: BLOCK_ROLE.full },
      { principal: { kind: 'space' }, role: BLOCK_ROLE.reader },
    ]);

    expect(ids).toEqual(['ada']);
  });

  it('lists nobody when nothing is declared', () => {
    expect(listEntryUserIds(null)).toEqual([]);
  });
});

describe('toAccessEntries', () => {
  it('keeps the order and attaches the person to each user entry', () => {
    const entries = toAccessEntries(
      [
        { principal: { kind: 'space' }, role: BLOCK_ROLE.reader },
        { principal: { kind: 'user', userId: 'ada' }, role: BLOCK_ROLE.full },
      ],
      new Map([['ada', ada]]),
    );

    expect(entries).toEqual([
      { principal: { kind: 'space' }, role: BLOCK_ROLE.reader, user: null },
      { principal: { kind: 'user', userId: 'ada' }, role: BLOCK_ROLE.full, user: ada },
    ]);
  });

  it('leaves the person empty when they are no longer in the workspace', () => {
    const [entry] = toAccessEntries(
      [{ principal: { kind: 'user', userId: 'gone' }, role: BLOCK_ROLE.editor }],
      new Map(),
    );

    expect(entry?.user).toBeNull();
  });

  it('reads no declaration as no entries', () => {
    expect(toAccessEntries(null, new Map())).toEqual([]);
  });
});

describe('toAccessMembers', () => {
  const members = [
    { ...ada, workspaceRole: USER_ROLE.ADMIN },
    { email: 'wen@test.com', id: 'wen', name: 'Wen', workspaceRole: USER_ROLE.WORKER },
    { email: 'cy@test.com', id: 'cy', name: 'Cy', workspaceRole: USER_ROLE.CLIENT },
  ];

  it('says everybody can read an internal space', () => {
    const result = toAccessMembers(members, { memberIds: new Set(), ownerId: null, visibility: 'PUBLIC_INTERNAL' });

    expect(result.every((member) => member.canReadSpace)).toBe(true);
  });

  it('lets only admins and members read a restricted space', () => {
    const result = toAccessMembers(members, { memberIds: new Set(['cy']), ownerId: null, visibility: 'RESTRICTED' });

    expect(result.map((member) => [member.id, member.canReadSpace])).toEqual([
      ['ada', true],
      ['wen', false],
      ['cy', true],
    ]);
  });

  it('lets only the owner and members read a private space, admins included', () => {
    const result = toAccessMembers(members, { memberIds: new Set(['cy']), ownerId: 'wen', visibility: 'PRIVATE' });

    expect(result.map((member) => [member.id, member.canReadSpace])).toEqual([
      ['ada', false],
      ['wen', true],
      ['cy', true],
    ]);
  });
});
