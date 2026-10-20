import type { Selection } from 'prosemirror-state';
import type { PageCollaborationParticipant } from '../../types/pages.collaboration.types';
import { BLOCK_SYNC_HASH_MULTIPLIER, BLOCK_SYNC_PRESENCE_COLORS } from '../constants/block-sync.constants';
import type { BlockPresenceUser, PageCollaborationParticipantIdentity } from '../types/block-sync.types';

const hashText = (text: string): number => {
  let hash = 0;
  for (const character of text) hash = (hash * BLOCK_SYNC_HASH_MULTIPLIER + character.charCodeAt(0)) >>> 0;
  return hash;
};

const pickColor = (userId: string): string =>
  BLOCK_SYNC_PRESENCE_COLORS[hashText(userId) % BLOCK_SYNC_PRESENCE_COLORS.length] ?? '';

/** The other people on the page, one per person, in the shape the participants list already shows. */
export const mapPresenceToParticipants = (
  users: readonly BlockPresenceUser[],
  localUserId: string,
  resolveIdentity: (userId: string) => PageCollaborationParticipantIdentity,
): readonly PageCollaborationParticipant[] => {
  const byUser = new Map<string, BlockPresenceUser>();
  for (const user of users) if (user.userId !== localUserId) byUser.set(user.userId, user);
  return [...byUser.values()].map((user) => {
    const identity = resolveIdentity(user.userId);
    return {
      clientId: hashText(user.userId),
      color: identity.color ?? pickColor(user.userId),
      cursor: { blockId: user.blockId },
      name: identity.name,
    };
  });
};

/** The nearest ancestor of the cursor that is a block the server knows; a paragraph inside a list item is not one. */
export const readBlockIdAtSelection = (
  selection: Selection,
  knownBlockIds: { readonly has: (blockId: string) => boolean },
): string | null => {
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const id: unknown = $from.node(depth).attrs.id;
    if (typeof id === 'string' && knownBlockIds.has(id)) return id;
  }
  return null;
};
