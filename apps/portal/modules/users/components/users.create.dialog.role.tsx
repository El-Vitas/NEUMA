'use client';

import { USER_ROLE_VALUES, type UserRole } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Label } from '@/shared/components/ui/label';

interface IProps {
  readonly onChange: (role: UserRole) => void;
  readonly value: UserRole;
}

/** Three options, all visible: a list to open would hide a choice that decides what the person can see. */
export const UsersCreateDialogRole = ({ onChange, value }: IProps) => {
  const t = useTranslations('users');
  const idPrefix = useId();

  return (
    <fieldset className="m-0 min-w-0 space-y-1 border-0 p-0">
      <legend className="mb-1 font-medium text-foreground text-sm">{t('role')}</legend>
      {USER_ROLE_VALUES.map((role) => {
        const radioId = `${idPrefix}-${role}`;
        return (
          <div className="flex min-h-11 items-center gap-3" key={role}>
            <input
              checked={value === role}
              className="size-4 accent-primary"
              id={radioId}
              name={idPrefix}
              onChange={() => onChange(role)}
              type="radio"
              value={role}
            />
            <Label className="cursor-pointer font-normal" htmlFor={radioId}>
              {t(`roles.${role}`)}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
};
