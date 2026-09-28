'use client';

import type { AccessTokenPermission } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { ACCESS_TOKEN_PERMISSION_MESSAGE_KEYS } from '../constants/access-tokens.constants';

interface IProps {
  readonly errorId?: string;
  readonly onToggle: (permission: AccessTokenPermission) => void;
  readonly permissions: readonly AccessTokenPermission[];
  readonly selected: readonly AccessTokenPermission[];
}

/** Las casillas de un nivel personalizado. Solo aparecen los permisos que quien crea el token tiene. */
export const AccessTokensPermissionCheckboxes = ({ errorId, onToggle, permissions, selected }: IProps) => {
  const t = useTranslations('accessTokens');
  const idPrefix = useId();

  return (
    <fieldset aria-describedby={errorId} className="m-0 min-w-0 space-y-1 border-0 p-0">
      <legend className="mb-1 font-medium text-foreground text-sm">{t('form.permissions')}</legend>
      {permissions.map((permission) => {
        const checkboxId = `${idPrefix}-${ACCESS_TOKEN_PERMISSION_MESSAGE_KEYS[permission]}`;
        return (
          <div className="flex min-h-11 items-center gap-3" key={permission}>
            <Checkbox
              checked={selected.includes(permission)}
              id={checkboxId}
              onCheckedChange={() => onToggle(permission)}
            />
            <Label className="cursor-pointer font-normal" htmlFor={checkboxId}>
              {t(`permissions.${ACCESS_TOKEN_PERMISSION_MESSAGE_KEYS[permission]}`)}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
};
