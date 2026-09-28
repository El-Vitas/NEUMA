import type { UserRole } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { SettingsNav } from '../components/settings.nav';
import { listSettingsNavItems } from '../lib/settings.lib';

interface IProps {
  readonly children: ReactNode;
  readonly role: UserRole;
}

/** El marco de la configuración: el título, las secciones que le tocan a quien mira, y la sección abierta. */
export const SettingsLayoutView = async ({ children, role }: IProps) => {
  const t = await getTranslations('settings');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-8 lg:pt-12">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-48 md:shrink-0">
          <SettingsNav items={listSettingsNavItems(role)} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
};
