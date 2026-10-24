'use client';

import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';
import { PagesMetadataRow } from '../../components/pages.metadata.row';
import { EMPTY_PAGE_ATTACHMENTS, EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type {
  PageComputedError,
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly computedError?: PageComputedError;
  readonly disabled: boolean;
  readonly onChange: (value: PagePropertyValue) => void;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly rowId?: string;
  readonly spaceId?: string;
  readonly value: PagePropertyValue | undefined;
}

/** A required property carries an asterisk, since the server refuses to save the row without it. */
export const PagesPropertiesRow = ({
  attachments = EMPTY_PAGE_ATTACHMENTS,
  computedError,
  disabled,
  onChange,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  rowId,
  spaceId,
  value,
}: IProps) => {
  const labelId = `page-property-label-${property.key}`;

  return (
    <PagesMetadataRow label={property.required ? `${property.label} *` : property.label} labelId={labelId}>
      <PagesPropertiesField
        ariaLabelledBy={labelId}
        attachments={attachments}
        computedError={computedError}
        disabled={disabled}
        onChange={onChange}
        personOptions={personOptions}
        property={property}
        rowId={rowId}
        spaceId={spaceId}
        value={value}
      />
    </PagesMetadataRow>
  );
};
