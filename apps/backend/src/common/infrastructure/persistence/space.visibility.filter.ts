import { SpaceVisibility } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { canReadSpace } from '../../domain/workspace.domain';

const spaceOrOperator = 'OR';

export const buildSpaceVisibilityFilter = (userId: string, role: UserRole): Prisma.SpaceWhereInput => ({
  [spaceOrOperator]: [
    { visibility: SpaceVisibility.PUBLIC_INTERNAL },
    ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
      ? [{ visibility: SpaceVisibility.RESTRICTED }]
      : [{ members: { some: { userId } }, visibility: SpaceVisibility.RESTRICTED }]),
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
