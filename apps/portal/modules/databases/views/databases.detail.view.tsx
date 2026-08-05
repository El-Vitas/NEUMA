import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/shared/components/ui/button';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
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
    <main className="min-h-full space-y-5 p-4 sm:p-6 lg:p-8">
      <Button asChild variant="ghost">
        <Link href={ROUTES.PORTAL_DATABASES}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('back')}
        </Link>
      </Button>
      <header className="border-border border-b pb-5">
        <p className="text-muted-foreground text-sm">
          {t('databaseSubtitle', { template: t(`templates.${database.template}`) })}
        </p>
        <h1 className="mt-1 font-display font-semibold text-4xl text-foreground sm:text-5xl">{database.name}</h1>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground text-sm">
          {database.properties.map((property) => (
            <span key={property.key}>
              {property.label} · {property.type}
            </span>
          ))}
        </div>
      </header>
      <DatabasesWorkspace database={database} records={records} />
    </main>
  );
};
