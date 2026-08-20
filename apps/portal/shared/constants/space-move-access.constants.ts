export const SPACE_MOVE_ACCESS_LOSS_API_ROUTE = (sourceSpaceId: string, targetSpaceId: string): string =>
  `/api/v1/spaces/${sourceSpaceId}/move-access-loss?targetSpaceId=${encodeURIComponent(targetSpaceId)}`;
