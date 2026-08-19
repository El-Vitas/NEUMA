import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

export const NotFoundContent = async () => {
  const t = await getTranslations('errors');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
      <h1 className="text-center font-semibold text-2xl">{t('notFoundTitle')}</h1>
      <p className="max-w-prose text-center text-muted-foreground text-sm">{t('notFoundBody')}</p>
      <Button asChild>
        <Link href={ROUTES.PORTAL}>{t('goHome')}</Link>
      </Button>
    </div>
  );
};
