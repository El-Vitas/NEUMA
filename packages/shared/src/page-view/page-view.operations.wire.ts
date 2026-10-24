import { z } from 'zod';
import { isOneOf } from '../value-list.lib.js';
import { Result } from '../result.js';
import { columnValueSchema, propertyKeySchema, rootFilterSchema } from './page-view.schemas.js';
import type { PageViewListKey, PageViewOperation } from './page-view.operations.types.js';
import {
  PAGE_VIEW_CONFIGURATION_LIST_KEYS,
  PAGE_VIEW_MAP_KEYS,
  PAGE_VIEW_SCALAR_KEYS,
} from './page-view.operations.types.js';
import { PAGE_SORT_DIRECTION_VALUES } from './page-view.types.js';

/** The table a pointer names when an operation addresses a view instead of a block. */
export const PAGE_VIEW_OPERATION_TABLE = 'view';

export interface PageViewWireOperation {
  readonly args: unknown;
  readonly command: string;
  readonly path: readonly string[];
}

const idSchema = z.string().min(1).max(64);

const listIdSchema = z.string().min(1).max(200);

const listAfterSchema = z.object({ after: listIdSchema.optional(), id: listIdSchema }).strict();

const listBeforeSchema = z.object({ before: listIdSchema.optional(), id: listIdSchema }).strict();

const listRemoveSchema = z.object({ id: listIdSchema }).strict();

const entrySchema = z.object({ key: columnValueSchema, value: z.json() }).strict();

const entryKeySchema = z.object({ key: columnValueSchema }).strict();

const sortSetSchema = z
  .object({
    after: propertyKeySchema.optional(),
    direction: z.enum(PAGE_SORT_DIRECTION_VALUES),
    propertyKey: propertyKeySchema,
  })
  .strict();

const sortRemoveSchema = z.object({ propertyKey: propertyKeySchema }).strict();

const filterInsertSchema = z
  .object({ after: idSchema.optional(), node: rootFilterSchema, parentId: idSchema.optional() })
  .strict();

const filterPatchSchema = z
  .object({
    groupOperator: z.enum(['AND', 'OR']).optional(),
    operator: z.string().min(1).max(40).optional(),
    propertyKey: propertyKeySchema.optional(),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]).optional(),
  })
  .strict();

const filterUpdateSchema = z.object({ id: idSchema, patch: filterPatchSchema }).strict();

const filterRemoveSchema = z.object({ id: idSchema }).strict();

type Outcome = Result<PageViewOperation, string>;

const fail = (message: string): Outcome => Result.fail(message);

const readListKey = (path: readonly string[]): PageViewListKey | null => {
  if (path.length === 1) return path[0] === 'manualOrder' ? 'manualOrder' : null;
  if (path.length !== 2 || path[0] !== 'configuration') return null;
  return PAGE_VIEW_CONFIGURATION_LIST_KEYS.find((candidate) => candidate === path[1]) ?? null;
};

const readConfigurationKey = (path: readonly string[]): string | null =>
  path.length === 2 && path[0] === 'configuration' ? (path[1] ?? null) : null;

const readList = (command: string, path: readonly string[], args: unknown): Outcome => {
  const list = readListKey(path);
  if (list === null) return fail('A list command addresses manualOrder or a list of the configuration');
  if (command === 'listAfter') {
    const parsed = listAfterSchema.safeParse(args);
    return parsed.success ? Result.ok({ ...parsed.data, command, list }) : fail('The arguments do not fit listAfter');
  }
  if (command === 'listBefore') {
    const parsed = listBeforeSchema.safeParse(args);
    return parsed.success ? Result.ok({ ...parsed.data, command, list }) : fail('The arguments do not fit listBefore');
  }
  const parsed = listRemoveSchema.safeParse(args);
  return parsed.success
    ? Result.ok({ ...parsed.data, command: 'listRemove', list })
    : fail('The arguments do not fit listRemove');
};

const readSet = (path: readonly string[], args: unknown): Outcome => {
  const key = readConfigurationKey(path);
  if (key === null || !isOneOf(PAGE_VIEW_SCALAR_KEYS, key))
    return fail('set addresses a scalar key of the configuration');
  return Result.ok({ command: 'set', key, value: args });
};

const readEntry = (command: string, path: readonly string[], args: unknown): Outcome => {
  const map = readConfigurationKey(path);
  if (map === null || !isOneOf(PAGE_VIEW_MAP_KEYS, map))
    return fail('An entry command addresses a map of the configuration');
  if (command === 'setEntry') {
    const parsed = entrySchema.safeParse(args);
    return parsed.success
      ? Result.ok({ command, key: parsed.data.key, map, value: parsed.data.value })
      : fail('The arguments do not fit setEntry');
  }
  const parsed = entryKeySchema.safeParse(args);
  return parsed.success
    ? Result.ok({ command: 'removeEntry', key: parsed.data.key, map })
    : fail('The arguments do not fit removeEntry');
};

const readSort = (command: string, path: readonly string[], args: unknown): Outcome => {
  if (readConfigurationKey(path) !== 'sorts') return fail('A sort command addresses the sorts');
  if (command === 'sortSet') {
    const parsed = sortSetSchema.safeParse(args);
    return parsed.success ? Result.ok({ ...parsed.data, command }) : fail('The arguments do not fit sortSet');
  }
  const parsed = sortRemoveSchema.safeParse(args);
  return parsed.success
    ? Result.ok({ command: 'sortRemove', propertyKey: parsed.data.propertyKey })
    : fail('The arguments do not fit sortRemove');
};

const readFilter = (command: string, path: readonly string[], args: unknown): Outcome => {
  if (readConfigurationKey(path) !== 'filter') return fail('A filter command addresses the filter');
  if (command === 'filterInsert') {
    const parsed = filterInsertSchema.safeParse(args);
    return parsed.success ? Result.ok({ ...parsed.data, command }) : fail('The arguments do not fit filterInsert');
  }
  if (command === 'filterUpdate') {
    const parsed = filterUpdateSchema.safeParse(args);
    return parsed.success ? Result.ok({ ...parsed.data, command }) : fail('The arguments do not fit filterUpdate');
  }
  const parsed = filterRemoveSchema.safeParse(args);
  return parsed.success
    ? Result.ok({ command: 'filterRemove', id: parsed.data.id })
    : fail('The arguments do not fit filterRemove');
};

/** Reads the operation a client sent to a view; the rest of the envelope (pointer, table) is checked by the caller. */
export const readPageViewOperation = ({ args, command, path }: PageViewWireOperation): Outcome => {
  switch (command) {
    case 'set':
      return readSet(path, args);
    case 'setEntry':
    case 'removeEntry':
      return readEntry(command, path, args);
    case 'listAfter':
    case 'listBefore':
    case 'listRemove':
      return readList(command, path, args);
    case 'sortSet':
    case 'sortRemove':
      return readSort(command, path, args);
    case 'filterInsert':
    case 'filterUpdate':
    case 'filterRemove':
      return readFilter(command, path, args);
    default:
      return fail(`The command ${command} is not known for a view`);
  }
};

const toListPath = (list: PageViewListKey): readonly string[] =>
  list === 'manualOrder' ? ['manualOrder'] : ['configuration', list];

const toWireBody = (operation: PageViewOperation): PageViewWireOperation => {
  switch (operation.command) {
    case 'set':
      return { args: operation.value, command: 'set', path: ['configuration', operation.key] };
    case 'setEntry':
      return {
        args: { key: operation.key, value: operation.value },
        command: 'setEntry',
        path: ['configuration', operation.map],
      };
    case 'removeEntry':
      return { args: { key: operation.key }, command: 'removeEntry', path: ['configuration', operation.map] };
    case 'listAfter':
      return {
        args: { id: operation.id, ...(operation.after === undefined ? {} : { after: operation.after }) },
        command: 'listAfter',
        path: toListPath(operation.list),
      };
    case 'listBefore':
      return {
        args: { id: operation.id, ...(operation.before === undefined ? {} : { before: operation.before }) },
        command: 'listBefore',
        path: toListPath(operation.list),
      };
    case 'listRemove':
      return { args: { id: operation.id }, command: 'listRemove', path: toListPath(operation.list) };
    case 'sortSet':
      return {
        args: {
          direction: operation.direction,
          propertyKey: operation.propertyKey,
          ...(operation.after === undefined ? {} : { after: operation.after }),
        },
        command: 'sortSet',
        path: ['configuration', 'sorts'],
      };
    case 'sortRemove':
      return { args: { propertyKey: operation.propertyKey }, command: 'sortRemove', path: ['configuration', 'sorts'] };
    case 'filterInsert':
      return {
        args: {
          node: operation.node,
          ...(operation.after === undefined ? {} : { after: operation.after }),
          ...(operation.parentId === undefined ? {} : { parentId: operation.parentId }),
        },
        command: 'filterInsert',
        path: ['configuration', 'filter'],
      };
    case 'filterUpdate':
      return {
        args: { id: operation.id, patch: operation.patch },
        command: 'filterUpdate',
        path: ['configuration', 'filter'],
      };
    case 'filterRemove':
      return { args: { id: operation.id }, command: 'filterRemove', path: ['configuration', 'filter'] };
  }
};

/** The envelope a client sends in `POST /transactions` for one operation on a view. */
export const toPageViewEnvelope = (
  viewId: string,
  operation: PageViewOperation,
): PageViewWireOperation & { readonly pointer: { readonly id: string; readonly table: 'view' } } => ({
  ...toWireBody(operation),
  pointer: { id: viewId, table: PAGE_VIEW_OPERATION_TABLE },
});
