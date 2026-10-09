'use client';

import { ACCESS_TOKEN_LEVELS, type AccessTokenLevel, type AccessTokenPermission } from '@company-brain/shared';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Button } from '@/shared/components/ui/button';
import { isDraftRowMissingPermissions } from '../lib/access-tokens.lib';
import type {
  AccessTokenDraftRow,
  AccessTokenDraftTarget,
  AccessTokenSpaceOption,
  AccessTokenTargetKind,
} from '../types/access-tokens.types';
import { AccessTokensChoiceGroup } from './access-tokens.choice.group';
import { AccessTokensPermissionCheckboxes } from './access-tokens.permission.checkboxes';
import { AccessTokensTargetPicker } from './access-tokens.target.picker';

interface IProps {
  readonly availableKinds: readonly AccessTokenTargetKind[];
  readonly canRemove: boolean;
  readonly excludedPageIds: readonly string[];
  readonly levels: readonly AccessTokenLevel[];
  readonly onKind: (kind: AccessTokenTargetKind) => void;
  readonly onLevel: (level: AccessTokenLevel) => void;
  readonly onRemove: () => void;
  readonly onTarget: (target: AccessTokenDraftTarget) => void;
  readonly onToggle: (permission: AccessTokenPermission) => void;
  readonly permissions: readonly AccessTokenPermission[];
  readonly placeName: string;
  readonly row: AccessTokenDraftRow;
  readonly spaceOptions: readonly AccessTokenSpaceOption[];
}

export const AccessTokensAccessRow = ({
  availableKinds,
  canRemove,
  excludedPageIds,
  levels,
  onKind,
  onLevel,
  onRemove,
  onTarget,
  onToggle,
  permissions,
  placeName,
  row,
  spaceOptions,
}: IProps) => {
  const t = useTranslations('accessTokens');
  const rowId = useId();
  const errorId = `${rowId}-error`;
  const isMissingPermissions = isDraftRowMissingPermissions(row);

  return (
    <li className="space-y-4 border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <AccessTokensTargetPicker
            availableKinds={availableKinds}
            excludedPageIds={excludedPageIds}
            onKind={onKind}
            onTarget={onTarget}
            spaceOptions={spaceOptions}
            target={row.target}
          />
        </div>
        {canRemove && (
          <Button
            aria-label={t('form.removeRow', { place: placeName })}
            className="size-11 shrink-0"
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
      <AccessTokensChoiceGroup
        legend={t('form.level')}
        name={`${rowId}-level`}
        onChange={onLevel}
        options={levels.map((level) => ({ hint: t(`levelHints.${level}`), label: t(`levels.${level}`), value: level }))}
        value={row.level}
      />
      {row.level === ACCESS_TOKEN_LEVELS.custom && (
        <AccessTokensPermissionCheckboxes
          errorId={isMissingPermissions ? errorId : undefined}
          onToggle={onToggle}
          permissions={permissions}
          selected={row.customPermissions}
        />
      )}
      {isMissingPermissions && (
        <p className="text-destructive text-sm" id={errorId} role="alert">
          {t('form.customEmpty')}
        </p>
      )}
    </li>
  );
};
