'use client';

import { CalendarIcon, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { getIsDateRange, parseAsDate, parseColumnFilterValue } from '@/shared/lib/data-table.lib';
import { formatDate } from '@/shared/utils/formatters';

import type { DataTableDateFilterProps, DateSelection } from './types/data-table-date-filter.types';

export const DataTableDateFilter = <TData,>({ column, title, multiple }: DataTableDateFilterProps<TData>) => {
  const t = useTranslations('common');
  const locale = useLocale();
  const columnFilterValue = column.getFilterValue();

  const selectedDates = useMemo<DateSelection>(() => {
    if (!columnFilterValue) {
      return multiple ? { from: undefined, to: undefined } : [];
    }

    if (multiple) {
      const timestamps = parseColumnFilterValue(columnFilterValue);
      return {
        from: parseAsDate(timestamps[0]),
        to: parseAsDate(timestamps[1]),
      };
    }

    const timestamps = parseColumnFilterValue(columnFilterValue);
    const date = parseAsDate(timestamps[0]);
    return date ? [date] : [];
  }, [columnFilterValue, multiple]);

  const onSelect = useCallback(
    (date: Date | DateRange | undefined) => {
      if (!date) {
        column.setFilterValue(undefined);
        return;
      }

      if (multiple && !('getTime' in date)) {
        const from = date.from?.getTime();
        const to = date.to?.getTime();
        column.setFilterValue(from || to ? [from, to] : undefined);
      } else if (!multiple && 'getTime' in date) {
        column.setFilterValue(date.getTime());
      }
    },
    [column, multiple],
  );

  const onReset = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      column.setFilterValue(undefined);
    },
    [column],
  );

  const hasValue = useMemo(() => {
    if (multiple) {
      if (!getIsDateRange(selectedDates)) return false;
      return selectedDates.from || selectedDates.to;
    }
    if (!Array.isArray(selectedDates)) return false;
    return selectedDates.length > 0;
  }, [multiple, selectedDates]);

  const formatDateRange = useCallback(
    (range: DateRange) => {
      if (!range.from && !range.to) return '';
      if (range.from && range.to) {
        return `${formatDate(range.from, { locale })} - ${formatDate(range.to, { locale })}`;
      }
      if (range.from) return formatDate(range.from, { locale });
      if (range.to) return formatDate(range.to, { locale });
      return '';
    },
    [locale],
  );

  const label = useMemo(() => {
    if (multiple) {
      if (!getIsDateRange(selectedDates)) return null;

      const hasSelectedDates = selectedDates.from || selectedDates.to;
      const dateText = hasSelectedDates ? formatDateRange(selectedDates) : t('selectRange');

      return (
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {hasSelectedDates && (
            <>
              <Separator className="mx-0.5 data-[orientation=vertical]:h-4" orientation="vertical" />
              <span>{dateText}</span>
            </>
          )}
        </span>
      );
    }

    if (getIsDateRange(selectedDates)) return null;

    const hasSelectedDate = selectedDates.length > 0;
    const dateText = hasSelectedDate ? formatDate(selectedDates[0], { locale }) : t('selectDate');

    return (
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {hasSelectedDate && (
          <>
            <Separator className="mx-0.5 data-[orientation=vertical]:h-4" orientation="vertical" />
            <span>{dateText}</span>
          </>
        )}
      </span>
    );
  }, [selectedDates, multiple, formatDateRange, title, locale, t]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="rounded-none border-dashed font-normal text-foreground" size="sm" variant="outline">
          {hasValue ? (
            <button
              aria-label={`${t('clear')} ${title}`}
              className="rounded-none opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onReset}
              type="button"
            >
              <XCircle />
            </button>
          ) : (
            <CalendarIcon />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        {multiple ? (
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="range"
            onSelect={onSelect}
            selected={getIsDateRange(selectedDates) ? selectedDates : { from: undefined, to: undefined }}
          />
        ) : (
          <Calendar
            captionLayout="dropdown"
            mode="single"
            onSelect={onSelect}
            selected={getIsDateRange(selectedDates) ? undefined : selectedDates[0]}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};
