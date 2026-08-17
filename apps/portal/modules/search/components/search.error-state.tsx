'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/shared/components/ui/button';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';

interface IProps {
  readonly onRetry: () => void;
}

export const SearchErrorState = ({ onRetry }: IProps) => {
  const common = useTranslations('common');
  const t = useTranslations('portal.search');
  const [isPending, startTransition] = useTransition();

  return (
    <section aria-live="polite" className="space-y-4">
      <FormErrorBanner message={t('loadError')} />
      <div className="flex justify-end">
        <Button className="min-h-11" disabled={isPending} onClick={() => startTransition(onRetry)} type="button">
          {isPending ? common('loading') : common('retry')}
        </Button>
      </div>
    </section>
  );
};
