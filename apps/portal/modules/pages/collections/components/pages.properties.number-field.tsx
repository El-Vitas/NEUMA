'use client';

import type { PagePropertyConfig } from '@neuma/shared';
import { fractionToPercent, PAGE_NUMBER_FORMAT, percentToFraction } from '@neuma/shared';
import { Input } from '@/shared/components/ui/input';
import { PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME } from '../../constants/pages.constants';
import { readNumberStep } from '../lib/pages.number.lib';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly autoFocus: boolean;
  readonly config: PagePropertyConfig;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onBlur?: () => void;
  readonly onChange: (value: number) => void;
  readonly placeholder: string;
  readonly value: number | undefined;
}

/** A percent is typed as a percent and stored as a fraction, so 25 here is 0.25 in the row. */
export const PagesPropertiesNumberField = ({
  ariaLabelledBy,
  autoFocus,
  config,
  disabled,
  fieldId,
  onBlur,
  onChange,
  placeholder,
  value,
}: IProps) => {
  const isPercent = config.numberFormat === PAGE_NUMBER_FORMAT.PERCENT;
  const shown = value !== undefined && isPercent ? fractionToPercent(value) : value;

  return (
    <Input
      aria-labelledby={ariaLabelledBy}
      autoFocus={autoFocus}
      className={PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME}
      disabled={disabled}
      id={fieldId}
      onBlur={onBlur}
      onChange={(event) => {
        const typed = Number(event.target.value);
        onChange(isPercent ? percentToFraction(typed) : typed);
      }}
      placeholder={placeholder}
      step={readNumberStep(config)}
      type="number"
      value={shown === undefined ? '' : String(shown)}
    />
  );
};
