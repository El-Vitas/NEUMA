import { Boxes, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { PortalEntryCard } from '../components/portal.entry-card';

interface IProps {
  readonly userName: string | null;
}

export const PortalView = async ({ userName }: IProps) => {
  const t = await getTranslations('portal');
  const navigationT = await getTranslations('navigation');
  const spacesT = await getTranslations('spaces');
  const searchT = await getTranslations('portal.search');

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-8 lg:pt-12">
      <PageHeader subtitle={t('description')} title={userName ? t('welcomeUser', { name: userName }) : t('welcome')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <PortalEntryCard
          description={spacesT('subtitle')}
          href={ROUTES.PORTAL_SPACES}
          icon={Boxes}
          title={navigationT('spaces')}
        />
        <PortalEntryCard
          description={searchT('subtitle')}
          href={ROUTES.PORTAL_SEARCH}
          icon={Search}
          title={navigationT('search')}
        />
      </div>
    </main>
  );
};
