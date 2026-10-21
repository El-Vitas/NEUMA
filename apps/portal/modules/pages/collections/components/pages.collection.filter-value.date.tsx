'use client';

import type { PagePropertyValue } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_FILTER_DATE_LABEL_KEYS } from '../constants/pages.view-filtering.constants';
import {
  buildFilterDateValue,
  listFilterDateChoices,
  readFilterDateChoice,
  readLocalDay,
} from '../lib/pages.filter-date.lib';
import type { PageFilterDateChoice } from '../types/pages.filter-value.types';

interface IProps {
  readonly isDisabled: boolean;
  readonly label: string;
  readonly onChange: (value: null | PagePropertyValue) => void;
  readonly value: null | PagePropertyValue;
}

/** A date condition compares with an exact day or with a moment that moves with the day it is looked at. */
export const PagesCollectionFilterValueDate = ({ isDisabled, label, onChange, value }: IProps) => {
  const t = useTranslations('pages.collection');
  const { choice, days } = readFilterDateChoice(value);
  const exactDay = typeof value === 'string' && choice === 'EXACT' ? value : '';

  const choose = (chosen: string): void => {
    const picked = listFilterDateChoices().find((candidate) => candidate === chosen);
    if (picked !== undefined) onChange(buildFilterDateValue(picked, days, readLocalDay(new Date())));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select disabled={isDisabled} onValueChange={choose} value={choice}>
        <SelectTrigger aria-label={label} className="w-40" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {listFilterDateChoices().map((candidate: PageFilterDateChoice) => (
            <SelectItem key={candidate} value={candidate}>
              {t(`filterDate.${PAGE_FILTER_DATE_LABEL_KEYS[candidate]}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {choice === 'EXACT' && (
        <Input
          aria-label={label}
          className="w-40"
          defaultValue={exactDay}
          disabled={isDisabled}
          onBlur={(event) => onChange(event.target.value === '' ? null : event.target.value)}
          type="date"
        />
      )}
      {(choice === 'PAST_DAYS' || choice === 'NEXT_DAYS') && (
        <Input
          aria-label={t('filterDate.daysLabel')}
          className="w-20"
          defaultValue={days === null ? '' : String(days)}
          disabled={isDisabled}
          max={365}
          min={1}
          onBlur={(event) => onChange(buildFilterDateValue(choice, Number(event.target.value) || 1, ''))}
          type="number"
        />
      )}
    </div>
  );
};
