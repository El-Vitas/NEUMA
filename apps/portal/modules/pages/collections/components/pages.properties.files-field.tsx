'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';

interface IProps {
  readonly ariaLabelledBy: string;
  /** The files uploaded to the row's own page: a cell points at them, it does not store copies. */
  readonly attachments: readonly AttachmentSummary[];
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly onChange: (value: readonly string[]) => void;
  readonly value: readonly string[];
}

export const PagesPropertiesFilesField = ({
  ariaLabelledBy,
  attachments,
  disabled,
  fieldId,
  onChange,
  value,
}: IProps) => {
  const t = useTranslations('pages.properties');
  const selectedIds = new Set(value);

  if (attachments.length === 0) return <p className="text-muted-foreground text-sm">{t('filesNone')}</p>;

  return (
    <fieldset aria-labelledby={ariaLabelledBy} className="m-0 flex flex-col gap-1 border-0 p-0">
      {attachments.map((attachment) => {
        const checkboxId = `${fieldId}-${attachment.id}`;
        return (
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 text-foreground text-sm"
            htmlFor={checkboxId}
            key={attachment.id}
          >
            <Checkbox
              checked={selectedIds.has(attachment.id)}
              disabled={disabled}
              id={checkboxId}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true ? [...value, attachment.id] : value.filter((current) => current !== attachment.id),
                )
              }
            />
            {attachment.originalFilename}
          </label>
        );
      })}
    </fieldset>
  );
};
