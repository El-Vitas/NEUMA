'use client';

import { humanizeSelectOption } from '@neuma/shared';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
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
        <SelectItem key={option.value} value={option.value}>
          <span
            className={cn('inline-flex items-center rounded-sm px-2 py-0.5', readPageOptionColorClass(option.color))}
          >
            {humanizeSelectOption(option.value)}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
