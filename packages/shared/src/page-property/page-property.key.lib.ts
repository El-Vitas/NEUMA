import {
  PAGE_PROPERTY_KEY_COMBINING_MARKS,
  PAGE_PROPERTY_KEY_DIGIT_PREFIX,
  PAGE_PROPERTY_KEY_EDGE_UNDERSCORES,
  PAGE_PROPERTY_KEY_FALLBACK,
  PAGE_PROPERTY_KEY_MAX_LENGTH,
  PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE,
  PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT,
} from './page-property.key.constants.js';

const toBareKey = (label: string): string => {
  const plain = label
    .normalize('NFD')
    .replace(PAGE_PROPERTY_KEY_COMBINING_MARKS, '')
    .toLowerCase()
    .replace(PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE, '_')
    .replace(PAGE_PROPERTY_KEY_EDGE_UNDERSCORES, '');
  if (plain === '') return PAGE_PROPERTY_KEY_FALLBACK;
  const prefixed = PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT.test(plain)
    ? `${PAGE_PROPERTY_KEY_DIGIT_PREFIX}${plain}`
    : plain;
  return prefixed.slice(0, PAGE_PROPERTY_KEY_MAX_LENGTH);
};

const numberKey = (bare: string, attempt: number): string => {
  const suffix = `_${String(attempt)}`;
  return `${bare.slice(0, PAGE_PROPERTY_KEY_MAX_LENGTH - suffix.length)}${suffix}`;
};

/**
 * The key is immutable once rows store values under it. A taken name gets a number
 * so it never lands on another column's values. Portal and agent share this, so
 * a column reads the same whoever made it.
 */
export const buildPagePropertyKey = (label: string, properties: readonly { readonly key: string }[]): string => {
  const bare = toBareKey(label);
  const taken = new Set(properties.map((property) => property.key));
  if (!taken.has(bare)) return bare;
  let attempt = 2;
  while (taken.has(numberKey(bare, attempt))) attempt += 1;
  return numberKey(bare, attempt);
};
