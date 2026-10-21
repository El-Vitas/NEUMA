'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { listPropertyOptions } from '../lib/pages.option-groups.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesOptionChip } from './pages.properties.option-chip';

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
  const selectedIds = new Set(value);

  return (
    <fieldset aria-labelledby={ariaLabelledBy} className="m-0 flex flex-col gap-1 border-0 p-0">
      {listPropertyOptions(property).map((option) => {
        const checkboxId = `${fieldId}-${option.id}`;
        return (
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 text-foreground text-sm"
            htmlFor={checkboxId}
            key={option.id}
          >
            <Checkbox
              checked={selectedIds.has(option.id)}
              disabled={disabled}
              id={checkboxId}
              onCheckedChange={(checked) =>
                onChange(checked === true ? [...value, option.id] : value.filter((current) => current !== option.id))
              }
            />
            <PagesPropertiesOptionChip option={option} />
          </label>
        );
      })}
    </fieldset>
  );
};
