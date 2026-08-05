import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ListEmptyState } from '@/shared/components/ui/list-empty-state';
import { ListRow } from '@/shared/components/ui/list-row';
import { ListRowGroup } from '@/shared/components/ui/list-row-group';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { DatabaseSpaceOption, DatabaseSummary } from '../types/databases.types';
import { DatabasesCreateForm } from './databases.create.form';

interface IProps {
  readonly canManage: boolean;
  readonly databases: readonly DatabaseSummary[];
  readonly spaces: readonly DatabaseSpaceOption[];
}

export const DatabasesList = ({ canManage, databases, spaces }: IProps) => {
  const t = useTranslations('databases');
  if (databases.length === 0) {
    return (
      <ListEmptyState
        action={canManage ? <DatabasesCreateForm spaces={spaces} /> : undefined}
        message={t('available')}
      />
    );
  }

  return (
    <ListRowGroup ariaLabel={t('title')}>
      {databases.map((database) => (
        <ListRow
          href={ROUTES.PORTAL_DATABASE(database.id)}
          key={database.id}
          secondary={t(`templates.${database.template}`)}
          title={database.name}
          trailing={
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
              <span className="max-w-28 text-right text-xs/4 sm:max-w-none">
                {t('propertyCount', { properties: database.properties.length, views: database.views.length })}
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 group-hover:text-primary" />
            </span>
          }
        />
      ))}
    </ListRowGroup>
  );
};
