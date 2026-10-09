'use client';

import type { PageRowHeight } from '@company-brain/shared';
import { PAGE_ROW_HEIGHT_VALUES } from '@company-brain/shared';
import { Rows3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { readPageRowHeight } from '../lib/pages.table-appearance.lib';
import type { PagesTableColumns } from '../types/pages.table-columns.types';

interface IProps {
  readonly columns: PagesTableColumns;
}

export const PagesCollectionTableAppearance = ({ columns }: IProps) => {
  const t = useTranslations('pages.collection');
  const wrapFieldId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={t('tableAppearance')}
          className="min-h-11 rounded-md text-muted-foreground"
          size="sm"
          type="button"
          variant="ghost"
        >
          <Rows3 aria-hidden="true" className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="px-1 text-muted-foreground text-xs uppercase tracking-wide">{t('rowHeight')}</p>
        <Select
          disabled={columns.isBusy}
          onValueChange={(value) => columns.setRowHeight(readPageRowHeight(value))}
          value={columns.rowHeight}
        >
          <SelectTrigger aria-label={t('rowHeight')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_ROW_HEIGHT_VALUES.map((height: PageRowHeight) => (
              <SelectItem key={height} value={height}>
                {t(`rowHeights.${height}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-foreground text-sm hover:bg-muted"
          htmlFor={wrapFieldId}
        >
          <Checkbox
            checked={columns.wrapsText}
            disabled={columns.isBusy}
            id={wrapFieldId}
            onCheckedChange={columns.toggleWrapsText}
          />
          {t('wrapText')}
        </label>
      </PopoverContent>
    </Popover>
  );
};
