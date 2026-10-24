import { BLOCK_TYPE, isPageTemplate } from '@neuma/shared';
import { isSameJson } from '../../../common/domain/json.domain';
import type {
  BlockJsonObject,
  BlockOperation,
  CollectionRowRules,
  RowCreation,
  UniqueIdDemand,
  WorkingBlock,
} from './block.transaction.domain.types';

const isRowCreation = (
  operation: BlockOperation,
  rules: ReadonlyMap<string, CollectionRowRules>,
): operation is RowCreation =>
  operation.command === 'create' &&
  operation.fields.type === BLOCK_TYPE.page &&
  operation.fields.parentId !== null &&
  !isPageTemplate(operation.fields.properties) &&
  rules.has(operation.fields.parentId);

const isRecord = (value: unknown): value is BlockJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readValues = (operation: RowCreation): BlockJsonObject => {
  const { values } = operation.fields.properties;
  return isRecord(values) ? values : {};
};

const withValues = (operation: RowCreation, values: BlockJsonObject): BlockOperation => ({
  ...operation,
  fields: { ...operation.fields, properties: { ...operation.fields.properties, values } },
});

const readRowValues = (row: WorkingBlock): BlockJsonObject => {
  const { values } = row.properties;
  return isRecord(values) ? values : {};
};

const findChangedKey = (keys: readonly string[], previous: BlockJsonObject, next: BlockJsonObject): string | null =>
  keys.find((key) => !isSameJson(previous[key], next[key])) ?? null;

/**
 * The key of the first value only the server may write that a row of a collection now holds differently than
 * before. The number of a new row is left to the stamp, which replaces whatever the client wrote there.
 */
export const findServerAssignedWrite = (
  before: ReadonlyMap<string, WorkingBlock>,
  after: ReadonlyMap<string, WorkingBlock>,
  rules: ReadonlyMap<string, CollectionRowRules>,
): string | null => {
  for (const row of after.values()) {
    const rowRules = row.parentId === null ? undefined : rules.get(row.parentId);
    if (row.type !== BLOCK_TYPE.page || rowRules === undefined) continue;
    const previous = before.get(row.id);
    const keys =
      previous === undefined
        ? rowRules.serverAssignedKeys.filter((key) => !rowRules.uniqueIdKeys.includes(key))
        : rowRules.serverAssignedKeys;
    const changed = findChangedKey(keys, previous === undefined ? {} : readRowValues(previous), readRowValues(row));
    if (changed !== null) return changed;
  }
  return null;
};

/** A block id may hold any character, so the pair is written as JSON instead of joined with a separator. */
export const toUniqueIdDemandKey = (collectionId: string, key: string): string => JSON.stringify([collectionId, key]);

/** How many numbers each collection must hand out, so the counter is moved once per collection and key. */
export const countNewRowsPerUniqueId = (
  operations: readonly BlockOperation[],
  rules: ReadonlyMap<string, CollectionRowRules>,
): readonly UniqueIdDemand[] => {
  const demands = new Map<string, UniqueIdDemand>();
  for (const operation of operations) {
    if (!isRowCreation(operation, rules) || operation.fields.parentId === null) continue;
    const collectionId = operation.fields.parentId;
    for (const key of rules.get(collectionId)?.uniqueIdKeys ?? []) {
      const demandKey = toUniqueIdDemandKey(collectionId, key);
      const demand = demands.get(demandKey) ?? { collectionId, count: 0, key };
      demands.set(demandKey, { ...demand, count: demand.count + 1 });
    }
  }
  return [...demands.values()];
};

/**
 * A new row of a collection gets the starting option of each status unless it names one, and the next number of
 * each unique id whatever the client wrote there. `firstNumbers` holds the first number handed out for each
 * `collectionId:key`; the rows of one transaction take consecutive numbers in the order they are created.
 */
export const stampNewRows = (
  operations: readonly BlockOperation[],
  rules: ReadonlyMap<string, CollectionRowRules>,
  firstNumbers: ReadonlyMap<string, number>,
): BlockOperation[] => {
  const taken = new Map<string, number>();
  return operations.map((operation) => {
    if (!isRowCreation(operation, rules) || operation.fields.parentId === null) return operation;
    const collectionId = operation.fields.parentId;
    const rowRules = rules.get(collectionId);
    if (rowRules === undefined) return operation;
    const values: BlockJsonObject = { ...readValues(operation) };
    for (const { key, optionId } of rowRules.statusDefaults) {
      if (values[key] === undefined) values[key] = optionId;
    }
    for (const key of rowRules.uniqueIdKeys) {
      const demand = toUniqueIdDemandKey(collectionId, key);
      const offset = taken.get(demand) ?? 0;
      taken.set(demand, offset + 1);
      values[key] = (firstNumbers.get(demand) ?? 1) + offset;
    }
    return withValues(operation, values);
  });
};
