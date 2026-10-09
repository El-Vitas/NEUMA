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
 * A new token starts read-only on all spaces, the safest useful default. A row moved to all spaces cannot
 * stay "no access" and falls back to read-only. Switching to custom keeps the checked boxes.
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
