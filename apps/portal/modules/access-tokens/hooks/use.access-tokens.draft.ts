'use client';

import { ACCESS_TOKEN_LEVELS, type AccessTokenPermission } from '@company-brain/shared';
import { useState } from 'react';
import { ACCESS_TOKEN_ALL_SPACES } from '../constants/access-tokens.constants';
import type { AccessTokenDraft, AccessTokenDraftRow } from '../types/access-tokens.types';

const togglePresence = (
  permissions: readonly AccessTokenPermission[],
  permission: AccessTokenPermission,
): readonly AccessTokenPermission[] =>
  permissions.includes(permission) ? permissions.filter((held) => held !== permission) : [...permissions, permission];

/**
 * Las filas del formulario de acceso de un token.
 *
 * Empieza con lo que el token ya tiene, o con una fila de solo lectura en todos
 * los espacios para uno nuevo: el punto de partida más seguro que todavía sirve
 * para algo. Pasar una fila a personalizado conserva las casillas marcadas,
 * para no perder lo armado a mano al tocar el nivel sin querer.
 */
export const useAccessTokensDraft = (initialRows: readonly AccessTokenDraftRow[]): AccessTokenDraft => {
  const [rows, setRows] = useState<readonly AccessTokenDraftRow[]>(() =>
    initialRows.length > 0
      ? initialRows
      : [
          {
            customPermissions: [],
            key: crypto.randomUUID(),
            level: ACCESS_TOKEN_LEVELS.read,
            target: ACCESS_TOKEN_ALL_SPACES,
          },
        ],
  );

  const changeRow = (key: string, change: (row: AccessTokenDraftRow) => AccessTokenDraftRow): void =>
    setRows((current) => current.map((row) => (row.key === key ? change(row) : row)));

  return {
    addRow: (target) =>
      setRows((current) => [
        ...current,
        { customPermissions: [], key: crypto.randomUUID(), level: ACCESS_TOKEN_LEVELS.read, target },
      ]),
    removeRow: (key) => setRows((current) => current.filter((row) => row.key !== key)),
    rows,
    setLevel: (key, level) => changeRow(key, (row) => ({ ...row, level })),
    setTarget: (key, target) => changeRow(key, (row) => ({ ...row, target })),
    togglePermission: (key, permission) =>
      changeRow(key, (row) => ({ ...row, customPermissions: togglePresence(row.customPermissions, permission) })),
  };
};
