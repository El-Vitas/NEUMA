import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { formatPropertyValueForDisplay, readCheckboxLabelKey } from '../lib/pages.properties.lib';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly properties: readonly PageSchemaProperty[];
  readonly rows: readonly PageRow[];
  readonly spaceId: string;
}

export const PagesCollectionTable = async ({ properties, rows, spaceId }: IProps) => {
  const t = await getTranslations('pages');
  if (rows.length === 0) return <EmptyState message={t('collection.emptyTable')} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('titleField')}</TableHead>
          {properties.map((property) => (
            <TableHead key={property.key}>{property.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link className="underline-offset-2 hover:underline" href={ROUTES.PORTAL_SPACE_PAGE(spaceId, row.id)}>
                {row.title.length > 0 ? row.title : t('untitled')}
              </Link>
            </TableCell>
            {properties.map((property) => {
              const rawValue = row.propertyValues?.[property.key];
              return (
                <TableCell key={property.key}>
                  {property.type === PAGE_PROPERTY_TYPE.CHECKBOX
                    ? t(readCheckboxLabelKey(rawValue))
                    : formatPropertyValueForDisplay(property, rawValue)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
