import { DatabasePropertyType } from '@neuma/db';
import { BLOCK_TYPE, isPagePropertySystemManaged, isPageTemplate } from '@neuma/shared';
import { isSameJson } from '../../../common/domain/json.domain';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import { validateSchemaPropertyValues } from '../../../common/domain/schema-property.domain';
import type { InvalidRowValue, RowValueWrite, StoredFile } from './block.row-values.domain.types';
import type { BlockJsonObject, BlockWrite, WorkingBlock } from './block.transaction.domain.types';

const isRecord = (value: unknown): value is BlockJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readValues = (block: WorkingBlock | undefined): BlockJsonObject => {
  const values = block?.properties.values;
  return isRecord(values) ? values : {};
};

const isServerManaged = (key: string, schema: readonly SchemaPropertyDefinition[]): boolean => {
  const property = schema.find((candidate) => candidate.key === key);
  return property !== undefined && isPagePropertySystemManaged(property.type);
};

const listChangedKeys = (
  previous: BlockJsonObject,
  next: BlockJsonObject,
  schema: readonly SchemaPropertyDefinition[],
): string[] =>
  Object.keys(next).filter((key) => !isSameJson(previous[key], next[key]) && !isServerManaged(key, schema));

const isRowOfCollection = (block: WorkingBlock, schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>) =>
  block.type === BLOCK_TYPE.page &&
  block.alive &&
  block.parentId !== null &&
  !isPageTemplate(block.properties) &&
  (schemas.get(block.parentId)?.length ?? 0) > 0;

/** The parents of the pages whose values this transaction changed: the only schemas it has to read. */
export const listCollectionsOfValueWrites = (
  writes: readonly BlockWrite[],
  before: ReadonlyMap<string, WorkingBlock>,
): string[] => [
  ...new Set(
    writes.flatMap(({ block }) => {
      if (block.type !== BLOCK_TYPE.page || block.parentId === null) return [];
      return isSameJson(readValues(before.get(block.id)), readValues(block)) ? [] : [block.parentId];
    }),
  ),
];

/**
 * The rows of a collection this transaction writes values into. Only the keys that changed are asked to be valid, so
 * a column made required, or an option removed, later does not lock the rows that still hold the old state. What the
 * server fills itself (numbers, dates of creation) is not a write of the person.
 */
export const listRowValueWrites = (
  writes: readonly BlockWrite[],
  before: ReadonlyMap<string, WorkingBlock>,
  schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>,
): RowValueWrite[] =>
  writes.flatMap(({ block }) => {
    if (!isRowOfCollection(block, schemas) || block.parentId === null) return [];
    const schema = schemas.get(block.parentId) ?? [];
    const values = readValues(block);
    const changedKeys = listChangedKeys(readValues(before.get(block.id)), values, schema);
    if (changedKeys.length === 0) return [];
    return [{ changedKeys, collectionId: block.parentId, rowId: block.id, title: block.text, values }];
  });

const hasPersonColumn = (schema: readonly SchemaPropertyDefinition[], keys: readonly string[]): boolean =>
  schema.some((property) => property.type === DatabasePropertyType.PERSON && keys.includes(property.key));

/** Whether a write names a person: only then the people of the workspace are needed to judge it. */
export const writesPeople = (
  writes: readonly RowValueWrite[],
  schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>,
): boolean => writes.some((write) => hasPersonColumn(schemas.get(write.collectionId) ?? [], write.changedKeys));

/** The first row that holds a value its column does not accept, by the same rules as a write through the page. */
export const findInvalidRowValue = (
  writes: readonly RowValueWrite[],
  schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>,
  personIds: ReadonlySet<string>,
): InvalidRowValue | null => {
  for (const write of writes) {
    const schema = schemas.get(write.collectionId) ?? [];
    const title = schema.find((property) => property.type === DatabasePropertyType.TITLE);
    const checked = validateSchemaPropertyValues(
      schema,
      {
        ...Object.fromEntries(write.changedKeys.map((key) => [key, write.values[key]])),
        ...(title === undefined ? {} : { [title.key]: write.title }),
      },
      { personIds, written: write.changedKeys },
    );
    if (checked.isFail()) return { message: String(checked.getError().details), rowId: write.rowId };
  }
  return null;
};

/** The files each row names in the columns of files it wrote, once each. */
export const listRowFileIds = (
  writes: readonly RowValueWrite[],
  schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>,
): ReadonlyMap<string, readonly string[]> => {
  const filesByRow = new Map<string, readonly string[]>();
  for (const write of writes) {
    const columns = (schemas.get(write.collectionId) ?? []).filter(
      (property) => property.type === DatabasePropertyType.FILES && write.changedKeys.includes(property.key),
    );
    const ids = columns.flatMap((column) => {
      const cell = write.values[column.key];
      return Array.isArray(cell) ? cell.filter((entry): entry is string => typeof entry === 'string') : [];
    });
    if (ids.length > 0) filesByRow.set(write.rowId, [...new Set(ids)]);
  }
  return filesByRow;
};

/**
 * The first file a row names that its writer may not attach: it must exist and be the writer's own, or already be
 * the row's. An id alone grants nothing.
 */
export const findUnattachableFile = (
  filesByRow: ReadonlyMap<string, readonly string[]>,
  assets: readonly StoredFile[],
  userId: string,
): string | null => {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  for (const [rowId, fileIds] of filesByRow) {
    const refused = fileIds.find((fileId) => {
      const asset = assetsById.get(fileId);
      return asset === undefined || (asset.ownerId !== userId && asset.pageId !== rowId);
    });
    if (refused !== undefined) return refused;
  }
  return null;
};
