'use client';

import type { PagePersonOption, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesMetadataRow } from './pages.metadata.row';
import { PagesPropertiesField } from './pages.properties.field';

interface IProps {
  readonly disabled: boolean;
  readonly onChange: (value: PagePropertyValue) => void;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly value: PagePropertyValue | undefined;
}

export const PagesPropertiesRow = ({ disabled, onChange, personOptions = [], property, value }: IProps) => {
  const labelId = `page-property-label-${property.key}`;

  return (
    <PagesMetadataRow label={property.label} labelId={labelId}>
      <PagesPropertiesField
        ariaLabelledBy={labelId}
        disabled={disabled}
        onChange={onChange}
        personOptions={personOptions}
        property={property}
        value={value}
      />
    </PagesMetadataRow>
  );
};
