'use client';

import { findPageOption } from '@neuma/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { listPropertyOptions } from '../lib/pages.option-groups.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesOptionChip } from './pages.properties.option-chip';

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
}: IProps) => {
  const chosen = findPageOption(property.options, value);

  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger
        aria-labelledby={ariaLabelledBy}
        className="w-full rounded-none border-transparent bg-transparent px-2 shadow-none hover:border-border data-[size=default]:h-11 dark:bg-transparent"
        id={fieldId}
      >
        <SelectValue placeholder={placeholder}>
          {chosen === null ? null : <PagesPropertiesOptionChip option={chosen} />}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {listPropertyOptions(property).map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <PagesPropertiesOptionChip option={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
