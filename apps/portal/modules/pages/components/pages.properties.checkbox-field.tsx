'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import type { PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: boolean) => void;
  readonly property: PageSchemaProperty;
  readonly value: boolean;
}

export const PagesPropertiesCheckboxField = ({ disabled, fieldId, onChange, property, value }: IProps) => (
  <div className="flex min-h-11 items-center gap-2">
    <Checkbox
      checked={value}
      disabled={disabled}
      id={fieldId}
      onCheckedChange={(checked) => onChange(checked === true)}
    />
    <Label htmlFor={fieldId}>{property.label}</Label>
  </div>
);
