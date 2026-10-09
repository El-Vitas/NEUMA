'use client';

import type { UserRole } from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Button } from '@/shared/components/ui/button';
import { ACCESS_TOKEN_UNNAMED_TARGET_MESSAGE_KEYS } from '../constants/access-tokens.constants';
import {
  canAddDraftRow,
  findNewRowTarget,
  listAvailableTargetKinds,
  listGrantableLevels,
  listGrantablePermissions,
  listPagesTakenByOtherRows,
  listRowSpaceOptions,
  nameDraftTarget,
  readDraftTargetForKind,
} from '../lib/access-tokens.lib';
import type { AccessTokenDraft, AccessTokenDraftRow, AccessTokenSpaceOption } from '../types/access-tokens.types';
import { AccessTokensAccessRow } from './access-tokens.access.row';

interface IProps {
  readonly draft: AccessTokenDraft;
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[];
}

/**
 * Qué puede hacer el token, fila por fila: en todos los espacios, en un
 * espacio o en una página, y dónde no puede nada.
 *
 * Solo se ofrece lo que quien lo crea puede dar: los espacios y páginas que ve
 * y los permisos de su rol. El servidor lo vuelve a revisar, pero una opción
 * que después falla es peor que no ofrecerla.
 */
export const AccessTokensAccessEditor = ({ draft, role, spaces }: IProps) => {
  const t = useTranslations('accessTokens');
  const hintId = useId();
  const permissions = listGrantablePermissions(role);

  const changeKind = (row: AccessTokenDraftRow, kind: AccessTokenDraftRow['target']['kind']): void => {
    if (kind === row.target.kind) return;
    const target = readDraftTargetForKind(draft.rows, row.key, kind, spaces);
    if (target !== null) draft.setTarget(row.key, target);
  };

  return (
    <fieldset aria-describedby={hintId} className="m-0 min-w-0 space-y-3 border-0 p-0">
      <legend className="font-medium text-foreground text-sm">{t('form.access')}</legend>
      <p className="text-muted-foreground text-sm" id={hintId}>
        {t('form.accessHint')}
      </p>
      <ul className="space-y-3">
        {draft.rows.map((row) => (
          <AccessTokensAccessRow
            availableKinds={listAvailableTargetKinds(draft.rows, row.key, spaces)}
            canRemove={draft.rows.length > 1}
            excludedPageIds={listPagesTakenByOtherRows(draft.rows, row.key)}
            key={row.key}
            levels={listGrantableLevels(role, row.target.kind)}
            onKind={(kind) => changeKind(row, kind)}
            onLevel={(level) => draft.setLevel(row.key, level)}
            onRemove={() => draft.removeRow(row.key)}
            onTarget={(target) => draft.setTarget(row.key, target)}
            onToggle={(permission) => draft.togglePermission(row.key, permission)}
            permissions={permissions}
            placeName={
              nameDraftTarget(row.target, spaces) ?? t(ACCESS_TOKEN_UNNAMED_TARGET_MESSAGE_KEYS[row.target.kind])
            }
            row={row}
            spaceOptions={listRowSpaceOptions(draft.rows, row.key, spaces)}
          />
        ))}
      </ul>
      <Button
        className="min-h-11"
        disabled={!canAddDraftRow(draft.rows)}
        onClick={() => draft.addRow(findNewRowTarget(draft.rows, spaces))}
        type="button"
        variant="outline"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t('form.addRow')}
      </Button>
    </fieldset>
  );
};
