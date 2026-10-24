import { DEFAULT_PAGE_PROPERTY_CONFIG, writePagePropertyConfig } from '@neuma/shared';
import type { PageCollectionOption, PageCollectionProperty } from '../types/pages.collections.types';

const toRequestedOption = (option: PageCollectionOption) => ({
  ...(option.color === null ? {} : { color: option.color }),
  ...(option.group === null || option.group === undefined ? {} : { group: option.group }),
  ...(option.id === null || option.id === undefined ? {} : { id: option.id }),
  value: option.value,
});

/** Only what the server reads leaves: no null placeholders, and the config limited to the fields the type uses. */
export const toRequestedProperty = (property: PageCollectionProperty) => {
  const config = writePagePropertyConfig(property.type, property.config ?? DEFAULT_PAGE_PROPERTY_CONFIG);
  const formula = property.computedDraft?.formula ?? null;
  const rollup = property.computedDraft?.rollup ?? null;
  return {
    ...(config === null || Object.keys(config).length === 0 ? {} : { config }),
    ...(formula === null ? {} : { formula }),
    key: property.key,
    label: property.label,
    ...(property.options === null ? {} : { options: property.options.map(toRequestedOption) }),
    required: property.required,
    ...(rollup === null ? {} : { rollup }),
    ...(property.twoWay === true ? { twoWay: true } : {}),
    type: property.type,
  };
};
