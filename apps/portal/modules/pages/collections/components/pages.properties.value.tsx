'use client';

import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import { formatPropertyValueForDisplay, readCheckboxLabelKey } from '../lib/pages.properties.lib';
import type { PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly property: PageSchemaProperty;
  readonly value: PagePropertyValue | undefined;
}

/**
 * What one property of one row says, drawn the way that kind of property reads.
 *
 * A chosen option wears the color it was given, so the same value looks the same
 * in a cell as on a card. Everything else is plain text: a date or a number
 * gains nothing from being dressed up.
 */
export const PagesPropertyValue = ({ property, value }: IProps) => {
  const t = useTranslations('pages');
  if (property.type === PAGE_PROPERTY_TYPE.CHECKBOX) return t(readCheckboxLabelKey(value));

  const chosen = property.options?.find((option) => option.value === value);
  const shown = formatPropertyValueForDisplay(property, value);
  if (chosen === undefined) return shown;

  return <span className={cn('rounded-sm px-2 py-0.5', readPageOptionColorClass(chosen.color))}>{shown}</span>;
};
