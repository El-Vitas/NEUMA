'use client';

import { humanizeSelectOption } from '@company-brain/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly property: PageSchemaProperty;
  readonly value: string;
}

export const PagesPropertiesSelectField = ({
  ariaLabelledBy,
  disabled,
  fieldId,
  onChange,
  placeholder,
  property,
  value,
}: IProps) => (
  <Select disabled={disabled} onValueChange={onChange} value={value}>
    <SelectTrigger
      aria-labelledby={ariaLabelledBy}
      className="w-full rounded-none border-transparent bg-transparent px-2 shadow-none hover:border-border data-[size=default]:h-11 dark:bg-transparent"
      id={fieldId}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {(property.options ?? []).map((option) => (
        <SelectItem key={option} value={option}>
          {humanizeSelectOption(option)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
