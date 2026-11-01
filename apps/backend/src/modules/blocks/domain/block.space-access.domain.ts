import { canReadSpace } from '../../../common/domain/workspace.domain';
import type { ListReadableSpacesInput } from './block.space-access.domain.types';

/**
 * The spaces each reader may open, from the facts of all of them at once: the same rule as the visibility filter the
 * single-reader reads apply in SQL (`canReadSpace`), without one lookup per reader.
 */
export const listReadableSpaceIdsByUser = ({
  memberships,
  readers,
  spaces,
}: ListReadableSpacesInput): ReadonlyMap<string, ReadonlySet<string>> => {
  const memberKeys = new Set(memberships.map(({ spaceId, userId }) => JSON.stringify([spaceId, userId])));
  return new Map(
    readers.map((reader) => {
      const readable = spaces.filter(
        (space) =>
          space.workspaceId === reader.workspaceId &&
          canReadSpace(
            reader.role,
            space.visibility,
            memberKeys.has(JSON.stringify([space.id, reader.userId])),
            space.ownerId === reader.userId,
          ),
      );
      return [reader.userId, new Set(readable.map((space) => space.id))];
    }),
  );
};
