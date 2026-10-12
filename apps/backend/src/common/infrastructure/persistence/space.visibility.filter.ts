import { and, or, SpaceVisibility } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import type { NeumaModels } from '../../../prisma/types/prisma.types';
import { canReadSpace } from '../../domain/workspace.domain';
import type { FilterCondition, ModelFilterScope } from '../../types/model.filter.types';

export const buildSpaceVisibilityFilter =
  (userId: string, role: UserRole) =>
  (space: ModelFilterScope<'Space'>): FilterCondition =>
    or(
      space.visibility.eq(SpaceVisibility.PUBLIC_INTERNAL),
      canReadSpace(role, SpaceVisibility.RESTRICTED, false)
        ? space.visibility.eq(SpaceVisibility.RESTRICTED)
        : and(space.members.some({ userId }), space.visibility.eq(SpaceVisibility.RESTRICTED)),
      and(space.ownerId.eq(userId), space.visibility.eq(SpaceVisibility.PRIVATE)),
      and(space.members.some({ userId }), space.visibility.eq(SpaceVisibility.PRIVATE)),
    );

export const findAccessibleSpaceId = async (
  models: NeumaModels,
  spaceId: string,
  workspaceId: string,
  userId: string,
  role: UserRole,
): Promise<string | null> => {
  const space = await models.Space.select('id')
    .where({ id: spaceId, workspaceId })
    .where(buildSpaceVisibilityFilter(userId, role))
    .first();
  return space === null ? null : space.id;
};
