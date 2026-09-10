import { Maximize2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly rows: readonly PageRow[];
  readonly spaceId: string;
}

export const PagesCollectionTable = async ({
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  rows,
  spaceId,
}: IProps) => {
  const t = await getTranslations('pages');
  if (rows.length === 0) return <EmptyState message={t('collection.emptyTable')} />;

  return (
    <Table data-testid="collection-table">
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
              <span className="inline-flex items-center gap-1.5">
                <PagesSidePanelLink className="underline-offset-2 hover:underline" pageId={row.id}>
                  {row.title.length > 0 ? row.title : t('untitled')}
                </PagesSidePanelLink>
                <Link
                  aria-label={t('sidePanel.openFullPage')}
                  className="-m-2 rounded-none p-2 text-muted-foreground hover:text-foreground"
                  href={ROUTES.PORTAL_SPACE_PAGE(spaceId, row.id)}
                  title={t('sidePanel.openFullPage')}
                >
                  <Maximize2 aria-hidden="true" className="size-3.5" />
                </Link>
              </span>
            </TableCell>
            {properties.map((property) => (
              <TableCell key={property.key}>
                <PagesPropertyValue
                  personOptions={personOptions}
                  property={property}
                  value={row.propertyValues?.[property.key]}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
