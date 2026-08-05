import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { TableEmptyState } from '@/shared/components/ui/table-empty-state';
import { formatPropertyValue } from '../lib/databases.lib';
import type { DatabaseProperty, DatabaseRecord } from '../types/databases.types';
import { DatabasesMobileRecords } from './databases.records.mobile';

interface IProps {
  readonly properties: readonly DatabaseProperty[];
  readonly records: readonly DatabaseRecord[];
}

export const DatabasesTable = ({ properties, records }: IProps) => {
  const t = useTranslations('databases');
  const columns = properties.filter((property) => property.key !== 'title');

  return (
    <>
      <DatabasesMobileRecords properties={properties} records={records} />
      <div className="hidden md:block" data-testid="database-records-desktop">
        <Table className="min-w-2xl">
          <caption className="sr-only">{t('records')}</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48 px-3">{t('titleColumn')}</TableHead>
              {columns.map((property) => (
                <TableHead className="min-w-36 px-3" key={property.key}>
                  {property.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableEmptyState colSpan={columns.length + 1} message={t('empty')} />
            ) : (
              records.map((record) => (
                <TableRow className="h-11" key={record.id}>
                  <TableCell className="max-w-80 truncate px-3 font-medium">{record.title}</TableCell>
                  {columns.map((property) => (
                    <TableCell className="max-w-64 truncate px-3" key={property.key}>
                      {formatPropertyValue(record.propertyValues[property.key], {
                        empty: t('emptyValue'),
                        no: t('no'),
                        yes: t('yes'),
                      })}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
