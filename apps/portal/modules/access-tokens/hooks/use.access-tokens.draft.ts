'use client';

import { ACCESS_TOKEN_LEVELS, type AccessTokenPermission } from '@company-brain/shared';
import { useState } from 'react';
import { readLevelMeaningfulFor } from '../lib/access-tokens.lib';
import type { AccessTokenDraft, AccessTokenDraftRow, AccessTokenDraftTarget } from '../types/access-tokens.types';

const togglePresence = (
  permissions: readonly AccessTokenPermission[],
  permission: AccessTokenPermission,
): readonly AccessTokenPermission[] =>
  permissions.includes(permission) ? permissions.filter((held) => held !== permission) : [...permissions, permission];

const newRow = (target: AccessTokenDraftTarget): AccessTokenDraftRow => ({
  customPermissions: [],
  key: crypto.randomUUID(),
  level: ACCESS_TOKEN_LEVELS.read,
  target,
});

/**
 * Las filas del formulario de acceso de un token.
 *
 * Empieza con lo que el token ya tiene, o con una fila de solo lectura en todos
 * los espacios para uno nuevo: el punto de partida más seguro que todavía sirve
 * para algo. Una fila que pasa a «todos los espacios» no puede quedar en «sin
 * acceso», que ahí no dice nada: vuelve a solo lectura. Pasar una fila a
 * personalizado conserva las casillas marcadas, para no perder lo armado a
 * mano al tocar el nivel sin querer.
 */
export const useAccessTokensDraft = (initialRows: readonly AccessTokenDraftRow[]): AccessTokenDraft => {
  const [rows, setRows] = useState<readonly AccessTokenDraftRow[]>(() =>
    initialRows.length > 0 ? initialRows : [newRow({ kind: 'ALL' })],
  );

  const changeRow = (key: string, change: (row: AccessTokenDraftRow) => AccessTokenDraftRow): void =>
    setRows((current) => current.map((row) => (row.key === key ? change(row) : row)));

  return {
    addRow: (target) => setRows((current) => [...current, newRow(target)]),
    removeRow: (key) => setRows((current) => current.filter((row) => row.key !== key)),
    rows,
    setLevel: (key, level) => changeRow(key, (row) => ({ ...row, level })),
    setTarget: (key, target) =>
      changeRow(key, (row) => ({ ...row, level: readLevelMeaningfulFor(row.level, target), target })),
    togglePermission: (key, permission) =>
      changeRow(key, (row) => ({ ...row, customPermissions: togglePresence(row.customPermissions, permission) })),
  };
};
