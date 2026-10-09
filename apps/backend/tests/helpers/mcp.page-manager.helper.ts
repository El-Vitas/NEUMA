import type { McpPageManager } from '@/modules/mcp/types/mcp.page-management.types';

const notUsedHere = (): Promise<never> => Promise.reject(new Error('Not used in this test'));

/** Un gestor de páginas para las pruebas que no cambian páginas enteras: cualquier uso falla y se nota. */
export const createUnusedPageManager = (): McpPageManager => ({
  duplicate: notUsedHere,
  listTrashed: notUsedHere,
  move: notUsedHere,
  previewTrashCascade: notUsedHere,
  rename: notUsedHere,
  restore: notUsedHere,
  setLocked: notUsedHere,
  setOwner: notUsedHere,
  setVerification: notUsedHere,
  trash: notUsedHere,
  updateCover: notUsedHere,
  updateIcon: notUsedHere,
});
