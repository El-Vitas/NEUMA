import { useTranslations } from 'next-intl';
import { ListEmptyState } from '@/shared/components/ui/list-empty-state';
import { formatPropertyValue } from '../lib/databases.lib';
import type { DatabaseProperty, DatabaseRecord } from '../types/databases.types';

interface IProps {
  readonly properties: readonly DatabaseProperty[];
  readonly records: readonly DatabaseRecord[];
}

export const DatabasesMobileRecords = ({ properties, records }: IProps) => {
  const t = useTranslations('databases');
  const columns = properties.filter((property) => property.key !== 'title');

  return (
    <section aria-label={t('records')} className="space-y-3 md:hidden" data-testid="database-records-mobile">
      {records.length === 0 ? (
        <ListEmptyState message={t('empty')} />
      ) : (
        <ol className="space-y-3">
          {records.map((record) => (
            <li className="border border-border bg-surface p-4 shadow-sm" key={record.id}>
              <article>
                <h2 className="wrap-break-word font-medium text-foreground text-lg/6">{record.title}</h2>
                {columns.length > 0 && (
                  <dl className="mt-4 divide-y divide-border border-border border-y">
                    {columns.map((property) => (
                      <div className="grid grid-cols-2 gap-4 py-3" key={property.key}>
                        <dt className="min-w-0 text-muted-foreground text-sm">{property.label}</dt>
                        <dd className="wrap-break-word min-w-0 text-right text-foreground text-sm">
                          {formatPropertyValue(record.propertyValues[property.key], {
                            empty: t('emptyValue'),
                            no: t('no'),
                            yes: t('yes'),
                          })}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
