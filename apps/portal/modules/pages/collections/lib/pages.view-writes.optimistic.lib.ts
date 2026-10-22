import type { PagePropertyValue, PagePropertyValues, PageRow } from '../types/pages.schema.types';
import type { PageViewWrite } from '../types/pages.view-writes.types';

/** The values with the written ones put in; a null clears the value, as the server does. */
const withWritten = (
  held: PagePropertyValues | null,
  written: Readonly<Record<string, null | PagePropertyValue>>,
): PagePropertyValues => {
  const merged: Record<string, PagePropertyValue> = { ...held };
  for (const [key, value] of Object.entries(written)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged;
};

/** A value in words, for the list of changes that wait: what the person would recognise as what they wrote. */
export const describeWrittenValue = (value: null | PagePropertyValue): string => {
  if (value === null) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return 'start' in value ? value.start : '';
  return String(value);
};

/**
 * The rows as a write will leave them once the server applies it, to be shown before it does. A write to a row the
 * browser does not hold shows nothing; a new page shows as a row of the collection with the values it starts with.
 */
export const toOptimisticRows = (write: PageViewWrite, held: PageRow | undefined): readonly PageRow[] => {
  switch (write.kind) {
    case 'cell':
      return held === undefined
        ? []
        : [{ ...held, propertyValues: withWritten(held.propertyValues, write.propertyValues) }];
    case 'move':
      return held === undefined ? [] : [{ ...held, propertyValues: withWritten(held.propertyValues, write.values) }];
    default:
      return [
        {
          id: write.id,
          lifecycle: 'ACTIVE',
          version: 0,
          order: 0,
          parentId: write.parentId,
          propertyValues: withWritten(null, { ...write.defaultValues, ...write.propertyValues }),
          spaceId: write.spaceId,
          title: write.title,
        },
      ];
  }
};
