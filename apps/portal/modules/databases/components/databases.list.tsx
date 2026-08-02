import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { Link } from '../../../i18n/navigation';
import type { DatabaseSummary } from '../types/databases.types';

interface IProps {
  readonly databases: readonly DatabaseSummary[];
}

export const DatabasesList = ({ databases }: IProps) => {
  const t = useTranslations('databases');
  if (databases.length === 0) {
    return (
      <div className="border bg-card px-4 py-16 text-center text-muted-foreground text-sm" role="status">
        {t('available')}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {databases.map((database) => (
        <Link
          className="block rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={ROUTES.PORTAL_DATABASE(database.id)}
          key={database.id}
        >
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>{database.name}</CardTitle>
              <p className="text-muted-foreground text-sm">{database.template}</p>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('propertyCount', { properties: database.properties.length, views: database.views.length })}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
