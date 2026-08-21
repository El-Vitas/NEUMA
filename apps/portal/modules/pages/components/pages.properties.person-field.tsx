'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_PERSON_FIELD_CLEAR_VALUE } from '../constants/pages.constants';
import { findPagePersonOption, getPagePersonOptionLabel } from '../lib/pages.properties.lib';
import type { PagePersonOption } from '../types/pages.schema.types';

interface IProps {
  readonly ariaLabelledBy: string;
  /** Shown as its own option so the field can be set back to nobody, instead of only ever replaced. */
  readonly clearLabel?: string;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly PagePersonOption[];
  readonly placeholder: string;
  readonly value: string;
}

export const PagesPropertiesPersonField = ({
  ariaLabelledBy,
  clearLabel,
  disabled,
  fieldId,
  onChange,
  options,
  placeholder,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const isUnknownPerson = value.length > 0 && findPagePersonOption(options, value) === undefined;
  const handleValueChange = (nextValue: string): void =>
    onChange(nextValue === PAGE_PERSON_FIELD_CLEAR_VALUE ? '' : nextValue);

  return (
    <Select disabled={disabled} onValueChange={handleValueChange} value={value}>
      <SelectTrigger
        aria-labelledby={ariaLabelledBy}
        className="w-full rounded-none border-transparent bg-transparent px-2 shadow-none hover:border-border data-[size=default]:h-11 dark:bg-transparent"
        id={fieldId}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isUnknownPerson && (
          <SelectItem disabled value={value}>
            {t('properties.unknownPerson')}
          </SelectItem>
        )}
        {clearLabel !== undefined && <SelectItem value={PAGE_PERSON_FIELD_CLEAR_VALUE}>{clearLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {getPagePersonOptionLabel(options, option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
