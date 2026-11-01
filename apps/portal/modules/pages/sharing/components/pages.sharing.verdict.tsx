'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { SharingScope, SharingVerdict } from '../types/pages.sharing.types';

interface IProps {
  readonly isConfirmed: boolean;
  readonly onConfirmedChange: (isConfirmed: boolean) => void;
  readonly scope: SharingScope;
  readonly verdict: SharingVerdict;
}

/** What the change costs the one making it. Losing everything with no way back cannot be confirmed away. */
export const PagesSharingVerdict = ({ isConfirmed, onConfirmedChange, scope, verdict }: IProps) => {
  const t = useTranslations('pages.sharing');
  const checkboxId = useId();

  if (verdict === 'safe') return null;

  if (verdict === 'lockout') {
    return (
      <p className="border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm" role="alert">
        {t('verdictLockout')}
      </p>
    );
  }

  return (
    <div className="space-y-2 border border-warning/30 bg-warning/10 p-3 text-sm">
      <p className="text-warning">
        {verdict === 'losesAccess' ? t('verdictLosesAccess', { scope }) : t('verdictLosesManagement')}
      </p>
      <div className="flex min-h-11 items-center gap-2">
        <input
          checked={isConfirmed}
          className="size-4"
          id={checkboxId}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          type="checkbox"
        />
        <label htmlFor={checkboxId}>{t('confirmVerdict')}</label>
      </div>
    </div>
  );
};
