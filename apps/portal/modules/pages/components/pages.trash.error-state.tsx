'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/shared/components/ui/button';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';

interface IProps {
  readonly onRetry: () => void;
}

export const PagesTrashErrorState = ({ onRetry }: IProps) => {
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  return (
    <section aria-live="polite" className="space-y-4">
      <FormErrorBanner message={tCommon('actionError')} />
      <div className="flex justify-end">
        <Button className="min-h-11" disabled={isPending} onClick={() => startTransition(onRetry)} type="button">
          {isPending ? tCommon('loading') : tCommon('retry')}
        </Button>
      </div>
    </section>
  );
};
