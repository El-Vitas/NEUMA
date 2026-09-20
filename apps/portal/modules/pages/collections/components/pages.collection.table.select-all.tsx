'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { usePagesRowSelection } from '../hooks/use.pages.row-selection';
import { readSelectAllState } from '../lib/pages.row-selection.lib';

interface IProps {
  /** Las filas que se están viendo: las que el filtro dejó pasar, no las que la colección guarda. */
  readonly rowIds: readonly string[];
}

/** La casilla que marca todo lo que se está viendo. */
export const PagesCollectionTableSelectAll = ({ rowIds }: IProps) => {
  const t = useTranslations('pages.collection');
  const selection = usePagesRowSelection();
  if (selection === null) return null;

  return (
    <Checkbox
      aria-label={t('selectAllRows')}
      checked={readSelectAllState(rowIds.filter((rowId) => selection.isSelected(rowId)).length, rowIds.length)}
      data-testid="select-all-rows"
      onCheckedChange={() => selection.toggleAll(rowIds)}
    />
  );
};
