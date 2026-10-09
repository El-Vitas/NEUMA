import { SpaceVisibility } from '@neuma/db';
import type { Prisma } from '@neuma/db/generated';
import type { UserRole } from '@neuma/shared';
import { canReadSpace } from '../../domain/workspace.domain';

export const buildSpaceVisibilityFilter = (userId: string, role: UserRole): Prisma.SpaceWhereInput => ({
  OR: [
    { visibility: SpaceVisibility.PUBLIC_INTERNAL },
    ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
      ? [{ visibility: SpaceVisibility.RESTRICTED }]
      : [{ members: { some: { userId } }, visibility: SpaceVisibility.RESTRICTED }]),
    { ownerId: userId, visibility: SpaceVisibility.PRIVATE },
    { members: { some: { userId } }, visibility: SpaceVisibility.PRIVATE },
  ],
});

export const findAccessibleSpaceId = async (
  transaction: Prisma.TransactionClient,
  spaceId: string,
  workspaceId: string,
  userId: string,
  role: UserRole,
): Promise<string | null> => {
  const space = await transaction.space.findFirst({
    select: { id: true },
    where: { id: spaceId, workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
  });
  return space === null ? null : space.id;
};
