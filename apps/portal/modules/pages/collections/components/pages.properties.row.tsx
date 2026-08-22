'use client';

import { PagesMetadataRow } from '../../components/pages.metadata.row';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type { PagePersonOption, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';

interface IProps {
  readonly disabled: boolean;
  readonly onChange: (value: PagePropertyValue) => void;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly value: PagePropertyValue | undefined;
}

export const PagesPropertiesRow = ({
  disabled,
  onChange,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  value,
}: IProps) => {
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
