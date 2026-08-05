'use client';

import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: string) => void;
  readonly property: PageSchemaProperty;
  readonly value: string;
}

export const PagesPropertiesSelectField = ({ disabled, fieldId, onChange, property, value }: IProps) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={fieldId}>{property.label}</Label>
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger className="h-11 w-full text-base" id={fieldId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(property.options ?? []).map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
