import type { McpBlockAccessReader } from '@/modules/mcp/types/mcp.types';

/** Every block is open to the person, as in a space that declares no permissions on its blocks. */
export const createOpenBlockAccess = (): McpBlockAccessReader => ({
  findReadableBlockIds: (blockIds) => Promise.resolve(new Set(blockIds)),
});
