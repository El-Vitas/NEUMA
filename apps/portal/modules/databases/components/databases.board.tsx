import { useTranslations } from 'next-intl';
import { groupRecordsBySelectProperty } from '../lib/databases.lib';
import type { DatabaseProperty, DatabaseRecord } from '../types/databases.types';

interface IProps {
  readonly property: DatabaseProperty | null;
  readonly records: readonly DatabaseRecord[];
}

export const DatabasesBoard = ({ property, records }: IProps) => {
  const t = useTranslations('databases');
  if (property === null) {
    return <p className="border bg-muted/30 p-6 text-muted-foreground">{t('noGrouping')}</p>;
  }

  return (
    <section aria-label={t('records')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="database-board-columns">
        {groupRecordsBySelectProperty(records, property).map((column) => (
          <section className="flex min-h-48 flex-col bg-surface-container-low" key={column.key}>
            <header className="flex min-h-11 items-center border-border border-b px-3">
              <h2 className="font-medium text-foreground text-sm">
                {column.key === 'unassigned' ? t('unassigned') : column.label}
              </h2>
            </header>
            <ol className="space-y-2 p-3">
              {column.records.length === 0 ? (
                <li className="text-muted-foreground text-sm">{t('noRecords')}</li>
              ) : (
                column.records.map((record) => (
                  <li className="wrap-break-word border border-border bg-surface p-3 text-sm shadow-sm" key={record.id}>
                    {record.title}
                  </li>
                ))
              )}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
};
