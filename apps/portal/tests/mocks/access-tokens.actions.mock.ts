import { mock } from 'bun:test';

/** Single factory for every test replacing this module: two factories for one module clash when tests run together. */
export const createAccessTokensActionsMock = (overrides: Record<string, unknown> = {}) => ({
  createAccessTokenAction: mock(async () => ({ data: undefined })),
  revokeAccessTokenAction: mock(async () => ({ data: undefined })),
  revokeWorkspaceAccessTokenAction: mock(async () => ({ data: undefined })),
  searchGrantablePagesAction: mock(async () => ({ data: [] })),
  updateAccessTokenAccessAction: mock(async () => ({ data: undefined })),
  ...overrides,
});
