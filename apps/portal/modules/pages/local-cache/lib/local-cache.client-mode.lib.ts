import {
  CLIENT_MODE_MAXIMUM_BYTES,
  CLIENT_MODE_MAXIMUM_ROWS,
  CLIENT_MODE_SERVER_ONLY_PROPERTY_TYPES,
} from '../constants/local-cache.constants';
import type { ClientModeDecision, ClientModeInput, ClientModeRefusal } from '../types/local-cache.types';

const refuse = (reason: ClientModeRefusal): ClientModeDecision => ({ isClientMode: false, reason });

const readServerOnlyKeys = (input: ClientModeInput): ReadonlySet<string> =>
  new Set(
    input.properties
      .filter((property) => CLIENT_MODE_SERVER_ONLY_PROPERTY_TYPES.includes(property.type))
      .map((property) => property.key),
  );

const listReferencedKeys = (input: ClientModeInput): readonly string[] => [
  ...input.filterPropertyKeys,
  ...input.sortPropertyKeys,
  ...(input.groupPropertyKey === null ? [] : [input.groupPropertyKey]),
];

/** Whether the browser can filter, sort and group this view alone with the shared engine (ADR 029). */
export const decideClientMode = (input: ClientModeInput): ClientModeDecision => {
  if (input.visibleRowCount > CLIENT_MODE_MAXIMUM_ROWS) return refuse('too-many-rows');
  if (input.estimatedBytes > CLIENT_MODE_MAXIMUM_BYTES) return refuse('too-heavy');
  if (input.hasSearch) return refuse('search');
  const serverOnlyKeys = readServerOnlyKeys(input);
  if (listReferencedKeys(input).some((key) => serverOnlyKeys.has(key))) return refuse('server-only-property');
  return { isClientMode: true };
};
