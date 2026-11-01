import { DatabasePropertyType } from '@neuma/db';
import {
  isPagePropertySystemManaged,
  pickDefaultStatusOption,
  readPagePropertyConfig,
  readPagePropertyOptions,
} from '@neuma/shared';
import type {
  CollectionFacts,
  CollectionRowRules,
  RelationProperty,
} from '../../domain/block.transaction.domain.types';
import type { StoredSchemaProperty } from '../../types/block.transaction.types';

const toRelation = (property: StoredSchemaProperty): RelationProperty[] => {
  const { mirrorPropertyKey, targetCollectionId } = readPagePropertyConfig(property.config);
  return property.type === DatabasePropertyType.RELATION && targetCollectionId !== null
    ? [{ key: property.key, mirrorPropertyKey, targetCollectionId }]
    : [];
};

const toStatusDefault = (property: StoredSchemaProperty): { key: string; optionId: string }[] => {
  if (property.type !== DatabasePropertyType.STATUS) return [];
  const option = pickDefaultStatusOption(readPagePropertyOptions(property.options) ?? []);
  return option === null ? [] : [{ key: property.key, optionId: option.id }];
};

const toRules = (properties: readonly StoredSchemaProperty[]): CollectionRowRules => ({
  serverAssignedKeys: properties.filter((property) => isPagePropertySystemManaged(property.type)).map(({ key }) => key),
  statusDefaults: properties.flatMap(toStatusDefault),
  uniqueIdKeys: properties.filter((property) => property.type === DatabasePropertyType.UNIQUE_ID).map(({ key }) => key),
});

const groupByCollection = (properties: readonly StoredSchemaProperty[]): Map<string, StoredSchemaProperty[]> => {
  const grouped = new Map<string, StoredSchemaProperty[]>();
  for (const property of properties) grouped.set(property.pageId, [...(grouped.get(property.pageId) ?? []), property]);
  return grouped;
};

/** Reads what a transaction needs from the schemas of the collections it writes into. */
export const toCollectionFacts = (properties: readonly StoredSchemaProperty[]): CollectionFacts => {
  const grouped = groupByCollection(properties);
  return {
    relations: new Map([...grouped].map(([id, list]) => [id, list.flatMap(toRelation)])),
    rules: new Map([...grouped].map(([id, list]) => [id, toRules(list)])),
  };
};
