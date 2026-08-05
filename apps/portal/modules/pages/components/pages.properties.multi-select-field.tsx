'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import type { PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: readonly string[]) => void;
  readonly property: PageSchemaProperty;
  readonly value: readonly string[];
}

export const PagesPropertiesMultiSelectField = ({ disabled, fieldId, onChange, property, value }: IProps) => {
  const selectedValues = new Set(value);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium text-foreground text-sm">{property.label}</legend>
      <div className="flex flex-col gap-2">
        {(property.options ?? []).map((option) => {
          const optionId = `${fieldId}-${option}`;
          return (
            <div className="flex min-h-11 items-center gap-2" key={option}>
              <Checkbox
                checked={selectedValues.has(option)}
                disabled={disabled}
                id={optionId}
                onCheckedChange={(checked) =>
                  onChange(checked === true ? [...value, option] : value.filter((current) => current !== option))
                }
              />
              <Label htmlFor={optionId}>{option}</Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};
