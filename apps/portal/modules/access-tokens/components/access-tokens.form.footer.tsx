'use client';

import { useTranslations } from 'next-intl';
import { FormActions } from '@/shared/components/forms/form-actions';
import { BackButton } from '@/shared/components/ui/back-button';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly canSubmit: boolean;
  readonly isPending: boolean;
  readonly pendingLabel: string;
  readonly submitLabel: string;
}

export const AccessTokensFormFooter = ({ canSubmit, isPending, pendingLabel, submitLabel }: IProps) => {
  const t = useTranslations('accessTokens.form');

  return (
    <FormActions
      back={<BackButton className="min-h-11" href={ROUTES.PORTAL_SETTINGS_TOKENS} label={t('backToTokens')} />}
    >
      <Button className="min-h-11" disabled={!canSubmit || isPending} type="submit">
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </FormActions>
  );
};
