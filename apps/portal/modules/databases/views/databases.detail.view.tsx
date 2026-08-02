import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { Link } from '../../../i18n/navigation';
import { DatabasesWorkspace } from '../components/databases.workspace';
import type { DatabaseRecord, DatabaseSummary } from '../types/databases.types';

interface IProps {
  readonly database: DatabaseSummary | null;
  readonly records: readonly DatabaseRecord[] | null;
}

export const DatabasesDetailView = async ({ database, records }: IProps) => {
  const t = await getTranslations('databases');
  if (database === null || records === null)
    return (
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <FormErrorBanner message={t('detailLoadError')} />
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <Button asChild variant="ghost">
        <Link href={ROUTES.PORTAL_DATABASES}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('back')}
        </Link>
      </Button>
      <PageHeader
        subtitle={t('databaseSubtitle', { template: t(`templates.${database.template}`) })}
        title={database.name}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('properties')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {database.properties.map((property) => (
            <span className="border px-3 py-1 text-sm" key={property.key}>
              {property.label} · {property.type}
            </span>
          ))}
        </CardContent>
      </Card>
      <DatabasesWorkspace database={database} records={records} />
    </main>
  );
};
