import { useTranslations } from 'next-intl';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { formatPropertyValue } from '../lib/databases.lib';
import type { DatabaseProperty, DatabaseRecord } from '../types/databases.types';

interface IProps {
  readonly properties: readonly DatabaseProperty[];
  readonly records: readonly DatabaseRecord[];
}

export const DatabasesTable = ({ properties, records }: IProps) => {
  const t = useTranslations('databases');
  const columns = properties.filter((property) => property.key !== 'title');

  return (
    <Table>
      <caption className="sr-only">{t('records')}</caption>
      <TableHeader>
        <TableRow>
          <TableHead>{t('titleColumn')}</TableHead>
          {columns.map((property) => (
            <TableHead key={property.key}>{property.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.length === 0 ? (
          <TableRow>
            <EmptyState message={t('empty')} />
          </TableRow>
        ) : (
          records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.title}</TableCell>
              {columns.map((property) => (
                <TableCell key={property.key}>
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
  );
};
