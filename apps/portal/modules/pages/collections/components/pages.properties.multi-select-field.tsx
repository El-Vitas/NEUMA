'use client';

import { humanizeSelectOption } from '@company-brain/shared';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: readonly string[]) => void;
  readonly property: PageSchemaProperty;
  readonly value: readonly string[];
}

export const PagesPropertiesMultiSelectField = ({
  ariaLabelledBy,
  disabled,
  fieldId,
  onChange,
  property,
  value,
}: IProps) => {
  const selectedValues = new Set(value);

  return (
    <fieldset aria-labelledby={ariaLabelledBy} className="m-0 flex flex-col gap-1 border-0 p-0">
      {(property.options ?? []).map((option) => {
        const optionId = `${fieldId}-${option.value}`;
        return (
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 text-foreground text-sm"
            htmlFor={optionId}
            key={option.value}
          >
            <Checkbox
              checked={selectedValues.has(option.value)}
              disabled={disabled}
              id={optionId}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true ? [...value, option.value] : value.filter((current) => current !== option.value),
                )
              }
            />
            <span className={cn('rounded-sm px-2 py-0.5', readPageOptionColorClass(option.color))}>
              {humanizeSelectOption(option.value)}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};
