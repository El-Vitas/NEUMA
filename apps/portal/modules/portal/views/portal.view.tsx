import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly userName: string | null;
}

export const PortalView = async ({ userName }: IProps) => {
  const t = await getTranslations('portal');
  return (
    <div className="space-y-6 p-6">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      <Card>
        <CardHeader>
          <CardTitle>{userName ? t('welcomeUser', { name: userName }) : t('welcome')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t.rich('modulesHint', {
              modules: () => <code>modules/</code>,
              routes: () => <code>app/[locale]/(portal)/</code>,
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
