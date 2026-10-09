'use client';

import { ACCESS_TOKEN_NAME_MAX_LENGTH } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface IProps {
  readonly isTaken: boolean;
  readonly onChange: (name: string) => void;
  readonly value: string;
}

/** Flags a duplicate name while typing: two identical names get confused when revoking one. */
export const AccessTokensNameField = ({ isTaken, onChange, value }: IProps) => {
  const t = useTranslations('accessTokens.form');
  const nameId = useId();
  const hintId = useId();
  const errorId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={nameId}>{t('name')}</Label>
      <Input
        aria-describedby={isTaken ? `${hintId} ${errorId}` : hintId}
        aria-invalid={isTaken}
        autoComplete="off"
        className="min-h-11"
        id={nameId}
        maxLength={ACCESS_TOKEN_NAME_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      />
      <p className="text-muted-foreground text-sm" id={hintId}>
        {t('nameHint')}
      </p>
      {isTaken && (
        <p className="text-destructive text-sm" id={errorId} role="alert">
          {t('nameTaken')}
        </p>
      )}
    </div>
  );
};
