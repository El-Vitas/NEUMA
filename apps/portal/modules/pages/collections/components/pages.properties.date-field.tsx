'use client';

import type { PageDateValue } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import { PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME } from '../../constants/pages.constants';
import { buildDateValue, toDayInputValue } from '../lib/pages.dates.lib';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly autoFocus: boolean;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onBlur?: () => void;
  readonly onChange: (value: PageDateValue | null) => void;
  readonly value: PageDateValue | null;
}

/** A day, or a range of days: the end is optional and never earlier than the start. */
export const PagesPropertiesDateField = ({
  ariaLabelledBy,
  autoFocus,
  disabled,
  fieldId,
  onBlur,
  onChange,
  value,
}: IProps) => {
  const t = useTranslations('pages.properties');
  const start = toDayInputValue(value?.start);
  const end = toDayInputValue(value?.end);

  return (
    /* Leaving one input for the other is not leaving the field: only focus going elsewhere commits the date. */
    <fieldset
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
      }}
    >
      <Input
        aria-labelledby={ariaLabelledBy}
        autoFocus={autoFocus}
        className={PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME}
        disabled={disabled}
        id={fieldId}
        onChange={(event) => onChange(buildDateValue(event.target.value, end))}
        type="date"
        value={start}
      />
      <Input
        aria-label={t('dateEnd')}
        className={PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME}
        disabled={disabled || start === ''}
        min={start === '' ? undefined : start}
        onChange={(event) => onChange(buildDateValue(start, event.target.value))}
        type="date"
        value={end}
      />
    </fieldset>
  );
};
