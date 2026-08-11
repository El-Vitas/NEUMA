'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: boolean) => void;
  readonly value: boolean;
}

export const PagesPropertiesCheckboxField = ({ ariaLabelledBy, disabled, fieldId, onChange, value }: IProps) => (
  <label className="flex size-11 cursor-pointer items-center justify-center" htmlFor={fieldId}>
    <Checkbox
      aria-labelledby={ariaLabelledBy}
      checked={value}
      disabled={disabled}
      id={fieldId}
      onCheckedChange={(checked) => onChange(checked === true)}
    />
  </label>
);
