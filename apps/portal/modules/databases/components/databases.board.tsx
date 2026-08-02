import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-max gap-4 md:grid-cols-3">
        {groupRecordsBySelectProperty(records, property).map((column) => (
          <Card className="min-h-48 w-64" key={column.key}>
            <CardHeader className="border-b py-4">
              <CardTitle className="text-sm">{column.key === 'unassigned' ? t('unassigned') : column.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {column.records.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('noRecords')}</p>
              ) : (
                column.records.map((record) => (
                  <div className="border bg-background p-3 text-sm" key={record.id}>
                    {record.title}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
