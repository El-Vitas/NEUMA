import { mock } from 'bun:test';

/**
 * Las acciones de los tokens como las ve una prueba de la pantalla: cada una
 * contesta bien y vacía, salvo la que la prueba quiera mirar.
 *
 * Una sola fábrica para todas las pruebas que reemplazan este módulo: dos
 * fábricas distintas del mismo módulo se pisan si las pruebas corren juntas.
 */
export const createAccessTokensActionsMock = (overrides: Record<string, unknown> = {}) => ({
  createAccessTokenAction: mock(async () => ({ data: undefined })),
  revokeAccessTokenAction: mock(async () => ({ data: undefined })),
  revokeWorkspaceAccessTokenAction: mock(async () => ({ data: undefined })),
  searchGrantablePagesAction: mock(async () => ({ data: [] })),
  updateAccessTokenAccessAction: mock(async () => ({ data: undefined })),
  ...overrides,
});
