'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { getPagePersonOptionLabel } from '../lib/pages.properties.lib';
import type { PagePersonOption } from '../types/pages.schema.types';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: readonly string[]) => void;
  readonly options: readonly PagePersonOption[];
  readonly value: readonly string[];
}

/** For a person property that allows several: each member is ticked or not, so nobody is replaced by mistake. */
export const PagesPropertiesPeopleField = ({ ariaLabelledBy, disabled, fieldId, onChange, options, value }: IProps) => {
  const selectedIds = new Set(value);

  return (
    <fieldset aria-labelledby={ariaLabelledBy} className="m-0 flex flex-col gap-1 border-0 p-0">
      {options.map((option) => {
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
            {getPagePersonOptionLabel(options, option)}
          </label>
        );
      })}
    </fieldset>
  );
};
