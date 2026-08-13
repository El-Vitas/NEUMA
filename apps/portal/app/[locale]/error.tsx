'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * What is shown when a page gives up.
 *
 * It says what happened in the reader's own words and never repeats what the
 * machine said: the message an exception carries is written for whoever is
 * going to fix it, not for whoever was writing. The digest is offered instead,
 * because it is the one thing that leads to the real cause without spelling it
 * out on screen.
 */
const LocaleErrorPage = ({ error, reset }: IProps) => {
  const t = useTranslations('errors');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
      <h1 className="text-center font-semibold text-2xl">{t('pageTitle')}</h1>
      <p className="max-w-prose text-center text-muted-foreground text-sm">{t('pageBody')}</p>
      <div className="flex items-center gap-2">
        <Button onClick={reset} type="button">
          {t('retry')}
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.PORTAL}>{t('goHome')}</Link>
        </Button>
      </div>
      {error.digest === undefined ? null : (
        <p className="text-muted-foreground/70 text-xs">{`${t('reference')}: ${error.digest}`}</p>
      )}
    </div>
  );
};

export default LocaleErrorPage;
