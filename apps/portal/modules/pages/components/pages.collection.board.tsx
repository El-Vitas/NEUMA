import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageBoardColumn } from '../types/pages.schema.types';

interface IProps {
  readonly columns: readonly PageBoardColumn[];
  readonly spaceId: string;
}

export const PagesCollectionBoard = async ({ columns, spaceId }: IProps) => {
  const t = await getTranslations('pages');

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" data-testid="collection-board">
      {columns.map((column) => (
        <div className="w-64 shrink-0 space-y-3" key={column.key}>
          <h3 className="font-medium text-foreground text-sm">
            {column.label} <span className="text-muted-foreground">({column.rows.length})</span>
          </h3>
          <div className="space-y-2">
            {column.rows.length === 0 && <p className="text-muted-foreground text-xs">{t('collection.emptyColumn')}</p>}
            {column.rows.map((row) => (
              <Card className="gap-0 p-3 text-sm" key={row.id}>
                <Link className="underline-offset-2 hover:underline" href={ROUTES.PORTAL_SPACE_PAGE(spaceId, row.id)}>
                  {row.title.length > 0 ? row.title : t('untitled')}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
