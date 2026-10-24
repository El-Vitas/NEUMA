import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import type { PageValueListChanges } from './page-value-list.domain.types';

/**
 * The values a row would hold after the lists change, out first and then in, as the write does. It is only for
 * checking the result is valid: the write itself is relative, so what another person put in the list meanwhile stays.
 */
export const applyValueListChanges = (
  current: SchemaPropertyValues | null,
  changes: PageValueListChanges,
): SchemaPropertyValues => {
  const values = new Map(Object.entries(current ?? {}));
  for (const [property, change] of Object.entries(changes)) {
    const held = values.get(property);
    const entries = Array.isArray(held) ? held.filter((entry): entry is string => typeof entry === 'string') : [];
    const kept = entries.filter((entry) => !change.remove.includes(entry));
    const added = change.add.filter((entry, position, all) => !kept.includes(entry) && all.indexOf(entry) === position);
    const next = [...kept, ...added];
    if (next.length === 0) values.delete(property);
    else values.set(property, next);
  }
  return Object.fromEntries(values);
};
