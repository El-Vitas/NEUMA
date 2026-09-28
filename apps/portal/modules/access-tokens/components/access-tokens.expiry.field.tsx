'use client';

import { MILLISECONDS_IN_A_DAY } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ACCESS_TOKEN_EXPIRY_OPTIONS, ACCESS_TOKEN_EXPIRY_VALUES } from '../constants/access-tokens.constants';
import { formatDateInputValue } from '../lib/access-tokens.lib';
import type { AccessTokenExpiry } from '../types/access-tokens.types';
import { AccessTokensChoiceGroup } from './access-tokens.choice.group';

interface IProps {
  readonly customDate: string;
  readonly expiry: AccessTokenExpiry;
  readonly onCustomDate: (date: string) => void;
  readonly onExpiry: (expiry: AccessTokenExpiry) => void;
}

/**
 * Hasta cuándo sirve el token: un plazo, una fecha elegida o nunca. La fecha
 * vale el día entero y no puede ser antes de mañana; el servidor vuelve a
 * exigir que sea después de ahora.
 */
export const AccessTokensExpiryField = ({ customDate, expiry, onCustomDate, onExpiry }: IProps) => {
  const t = useTranslations('accessTokens');
  const groupId = useId();
  const dateId = useId();
  const dateHintId = useId();
  /** El primer día que se puede elegir se fija al abrir el formulario, y no se recalcula en cada dibujo. */
  const [earliestDay] = useState(() => formatDateInputValue(new Date(Date.now() + MILLISECONDS_IN_A_DAY)));

  return (
    <div className="space-y-4">
      <AccessTokensChoiceGroup
        legend={t('form.expiry')}
        name={`${groupId}-expiry`}
        onChange={onExpiry}
        options={ACCESS_TOKEN_EXPIRY_VALUES.map((option) => ({ label: t(`expiry.${option}`), value: option }))}
        value={expiry}
      />
      {expiry === ACCESS_TOKEN_EXPIRY_OPTIONS.custom && (
        <div className="space-y-2">
          <Label className="block" htmlFor={dateId}>
            {t('form.expiryDate')}
          </Label>
          <Input
            aria-describedby={dateHintId}
            className="min-h-11 w-full sm:w-56"
            id={dateId}
            min={earliestDay}
            onChange={(event) => onCustomDate(event.target.value)}
            required
            type="date"
            value={customDate}
          />
          <p className="text-muted-foreground text-sm" id={dateHintId}>
            {t('form.expiryDateHint')}
          </p>
        </div>
      )}
      {expiry === ACCESS_TOKEN_EXPIRY_OPTIONS.never && (
        <p className="text-muted-foreground text-sm">{t('form.expiryNeverHint')}</p>
      )}
    </div>
  );
};
