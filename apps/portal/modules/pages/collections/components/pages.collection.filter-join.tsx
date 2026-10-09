'use client';

import type { PageFilterGroupOperator } from '@company-brain/shared';
import { PAGE_FILTER_GROUP_OPERATOR } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

interface IProps {
  readonly disabled: boolean;
  readonly onChange: (operator: PageFilterGroupOperator) => void;
  readonly operator: PageFilterGroupOperator;
  readonly position: number;
}

/**
 * Editable only on the second condition: a group has one operator, and a selector per line would suggest each
 * pair joins differently. Later lines repeat it read-only.
 */
export const PagesCollectionFilterJoin = ({ disabled, onChange, operator, position }: IProps) => {
  const t = useTranslations('pages.collection');
  const label = operator === PAGE_FILTER_GROUP_OPERATOR.OR ? t('joinOr') : t('joinAnd');

  if (position === 0) {
    return <span className="w-14 shrink-0 pt-2 text-muted-foreground text-xs">{t('filterWhere')}</span>;
  }
  if (position > 1) {
    return <span className="w-14 shrink-0 pt-2 text-muted-foreground text-xs">{label}</span>;
  }

  return (
    <Select
      disabled={disabled}
      onValueChange={(value) =>
        onChange(
          value === PAGE_FILTER_GROUP_OPERATOR.OR ? PAGE_FILTER_GROUP_OPERATOR.OR : PAGE_FILTER_GROUP_OPERATOR.AND,
        )
      }
      value={operator}
    >
      <SelectTrigger aria-label={t('joinConditions')} className="w-14 shrink-0 border-transparent px-2" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PAGE_FILTER_GROUP_OPERATOR.AND}>{t('joinAnd')}</SelectItem>
        <SelectItem value={PAGE_FILTER_GROUP_OPERATOR.OR}>{t('joinOr')}</SelectItem>
      </SelectContent>
    </Select>
  );
};
