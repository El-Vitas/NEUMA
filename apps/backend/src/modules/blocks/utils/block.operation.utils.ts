import { isOneOf, Result } from '@neuma/shared';
import type { z } from 'zod';
import type { DomainError } from '../../../common/domain/domain.error';
import {
  BLOCK_CHILDREN_PATH,
  BLOCK_COMMAND,
  BLOCK_PAGE_COMMAND,
  BLOCK_ROOT_PAGES_PATH,
  BLOCK_SPACE_TABLE,
} from '../constants/block.transaction.constants';
import {
  BLOCK_BAG_VALUES,
  BLOCK_CREATE_FIELD_VALUES,
  BLOCK_WRITABLE_FIELD_VALUES,
} from '../domain/block.operation.constants';
import type { BlockFieldPatch, BlockOperation } from '../domain/block.transaction.domain.types';
import { BlockFieldNotWritableError, BlockOperationInvalidError } from '../domain/block.transaction.error';
import {
  blockApplyTextArgsSchema,
  blockCreateArgsSchema,
  blockEntriesSchema,
  blockEntryValueSchema,
  blockFieldPatchSchema,
  blockListAfterArgsSchema,
  blockListBeforeArgsSchema,
  blockListRemoveArgsSchema,
  blockMergePageValuesArgsSchema,
  blockMoveToSpaceRootArgsSchema,
  blockOperationEnvelopeSchema,
  blockPropertyKeySchema,
  blockSetLifecycleArgsSchema,
  blockSetLockArgsSchema,
  blockSetOwnerArgsSchema,
  blockSetPermissionArgsSchema,
  blockSetVerificationArgsSchema,
  blockTrustedOperationEnvelopeSchema,
} from '../schemas/block.operation.schemas';
import type {
  BlockInsertArgs,
  BlockParsedOperation as Parsed,
  BlockOperationEnvelope as ReadEnvelope,
} from '../types/block.transaction.types';

const toIssues = (error: z.ZodError): { message: string; path: string }[] =>
  error.issues.map((issue) => ({ message: issue.message, path: issue.path.join('.') }));

const invalid = (message: string, details?: unknown): Parsed =>
  Result.fail(new BlockOperationInvalidError(message, details));

const invalidArguments = (error: z.ZodError): Parsed =>
  invalid('The arguments do not fit the command', toIssues(error));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Mass assignment guard: a key outside the allowed list is named in the refusal instead of being ignored. */
const findForbiddenKey = (args: unknown, allowed: readonly string[]): string | undefined => {
  if (!isRecord(args)) return undefined;
  const allowedKeys = new Set(allowed);
  const forbiddenKeys = Object.keys(args).filter((key) => !allowedKeys.has(key));
  return forbiddenKeys[0];
};

const toFieldPatch = (parsed: z.infer<typeof blockFieldPatchSchema>): BlockFieldPatch => ({
  ...(parsed.alive === undefined ? {} : { alive: parsed.alive }),
  ...(parsed.format === undefined ? {} : { format: parsed.format }),
  ...(parsed.parentId === undefined ? {} : { parentId: parsed.parentId }),
  ...(parsed.properties === undefined ? {} : { properties: parsed.properties }),
  ...(parsed.type === undefined ? {} : { type: parsed.type }),
});

const parseFieldPatch = (blockId: string, args: unknown): Parsed => {
  const forbidden = findForbiddenKey(args, BLOCK_WRITABLE_FIELD_VALUES);
  if (forbidden !== undefined) return Result.fail(new BlockFieldNotWritableError(forbidden));
  const parsed = blockFieldPatchSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  if (Object.keys(parsed.data).length === 0) return invalid('The operation changes no field');
  return Result.ok({ blockId, command: 'patchFields', patch: toFieldPatch(parsed.data) });
};

const parseCreate = (blockId: string, args: unknown): Parsed => {
  const forbidden = findForbiddenKey(args, BLOCK_CREATE_FIELD_VALUES);
  if (forbidden !== undefined) return Result.fail(new BlockFieldNotWritableError(forbidden));
  const parsed = blockCreateArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  if (parsed.data.id !== blockId) return invalid('The id of the new block must equal the id of its pointer');
  const { format, parentId, properties, type } = parsed.data;
  return Result.ok({
    blockId,
    command: 'create',
    fields: { format: format ?? null, parentId, properties: properties ?? {}, type },
  });
};

const parseEntryReplace = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  const [bag, key] = path;
  if (bag === undefined || key === undefined || !isOneOf(BLOCK_BAG_VALUES, bag)) {
    return invalid('Only an entry of properties or format can be set by path');
  }
  const keyParsed = blockPropertyKeySchema.safeParse(key);
  const valueParsed = blockEntryValueSchema.safeParse(args);
  if (!keyParsed.success) return invalidArguments(keyParsed.error);
  if (!valueParsed.success) return invalidArguments(valueParsed.error);
  return Result.ok({ bag, blockId, command: 'replaceEntry', key, value: valueParsed.data });
};

const parseSet = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length === 0) return parseCreate(blockId, args);
  const [field] = path;
  if (field === undefined || !isOneOf(BLOCK_WRITABLE_FIELD_VALUES, field)) {
    return Result.fail(new BlockFieldNotWritableError(field ?? ''));
  }
  if (path.length === 1) return parseFieldPatch(blockId, { [field]: args });
  return parseEntryReplace(blockId, path, args);
};

const parseEntryMerge = (blockId: string, bag: string, args: unknown): Parsed => {
  if (!isOneOf(BLOCK_BAG_VALUES, bag)) return invalid('Only properties or format can be merged by path');
  const parsed = blockEntriesSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ bag, blockId, command: 'mergeEntries', values: parsed.data });
};

const parseUpdate = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  const [bag] = path;
  if (path.length === 0) return parseFieldPatch(blockId, args);
  if (path.length === 1 && bag !== undefined) return parseEntryMerge(blockId, bag, args);
  return invalid('An update addresses the block, its properties or its format');
};

const parseInsertArgs = (side: 'after' | 'before', args: unknown): Result<BlockInsertArgs, z.ZodError> => {
  if (side === 'after') {
    const parsed = blockListAfterArgsSchema.safeParse(args);
    return parsed.success
      ? Result.ok({ anchorId: parsed.data.after ?? null, childId: parsed.data.id })
      : Result.fail(parsed.error);
  }
  const parsed = blockListBeforeArgsSchema.safeParse(args);
  return parsed.success
    ? Result.ok({ anchorId: parsed.data.before ?? null, childId: parsed.data.id })
    : Result.fail(parsed.error);
};

const parseListInsert = (blockId: string, path: readonly string[], args: unknown, side: 'after' | 'before'): Parsed => {
  if (path.length !== 1 || path[0] !== BLOCK_CHILDREN_PATH) return invalid('A list command addresses children');
  const parsed = parseInsertArgs(side, args);
  if (parsed.isFail()) return invalidArguments(parsed.getError());
  const { anchorId, childId } = parsed.getValue();
  return Result.ok({ blockId, childId, command: 'insertChild', placement: { anchorId, side } });
};

const parseListRemove = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 1 || path[0] !== BLOCK_CHILDREN_PATH) return invalid('A list command addresses children');
  const parsed = blockListRemoveArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ blockId, childId: parsed.data.id, command: 'removeChild' });
};

const parseApplyText = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('applyText addresses the block');
  const parsed = blockApplyTextArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  const update = new Uint8Array(Buffer.from(parsed.data.update, 'base64'));
  return Result.ok({ blockId, command: 'applyText', property: parsed.data.property, update });
};

const parseSetPermission = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('setPermission addresses the block');
  const parsed = blockSetPermissionArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ blockId, command: 'setPermissions', permissions: parsed.data.permissions });
};

const parseSetLifecycle = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('setLifecycle addresses the block');
  const parsed = blockSetLifecycleArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({
    blockId,
    command: 'setLifecycle',
    detachFromParentId: parsed.data.detachFromParentId ?? null,
    lifecycle: parsed.data.lifecycle,
  });
};

const parseSetLock = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('setLock addresses the block');
  const parsed = blockSetLockArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ blockId, command: 'setLock', isLocked: parsed.data.locked });
};

const parseSetVerification = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('setVerification addresses the block');
  const parsed = blockSetVerificationArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  const { expiresAt, verified } = parsed.data;
  return Result.ok({
    blockId,
    command: 'setVerification',
    expiresAt: expiresAt === undefined || expiresAt === null ? null : new Date(expiresAt),
    isVerified: verified,
  });
};

const parseSetOwner = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('setOwner addresses the block');
  const parsed = blockSetOwnerArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ blockId, command: 'setOwner', ownerId: parsed.data.ownerId });
};

const parseMergePageValues = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('mergePageValues addresses the block');
  const parsed = blockMergePageValuesArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ blockId, command: 'mergePageValues', values: parsed.data.values });
};

const parseRewritePageValues = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('rewritePageValues addresses the block');
  const parsed = blockMergePageValuesArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({ blockId, command: 'rewritePageValues', values: parsed.data.values });
};

const parseMoveToSpaceRoot = (blockId: string, path: readonly string[], args: unknown): Parsed => {
  if (path.length !== 0) return invalid('moveToSpaceRoot addresses the block');
  const parsed = blockMoveToSpaceRootArgsSchema.safeParse(args);
  if (!parsed.success) return invalidArguments(parsed.error);
  return Result.ok({
    blockId,
    command: 'moveToSpaceRoot',
    afterId: parsed.data.afterId ?? null,
    detachFromParentId: parsed.data.detachFromParentId ?? null,
    parentId: parsed.data.parentId ?? null,
    spaceId: parsed.data.spaceId,
  });
};

const parsePageCommand = ({ args, command, path, pointer }: ReadEnvelope): Parsed => {
  switch (command) {
    case BLOCK_PAGE_COMMAND.setLifecycle:
      return parseSetLifecycle(pointer.id, path, args);
    case BLOCK_PAGE_COMMAND.setLock:
      return parseSetLock(pointer.id, path, args);
    case BLOCK_PAGE_COMMAND.setVerification:
      return parseSetVerification(pointer.id, path, args);
    case BLOCK_PAGE_COMMAND.setOwner:
      return parseSetOwner(pointer.id, path, args);
    case BLOCK_PAGE_COMMAND.mergePageValues:
      return parseMergePageValues(pointer.id, path, args);
    case BLOCK_PAGE_COMMAND.rewritePageValues:
      return parseRewritePageValues(pointer.id, path, args);
    case BLOCK_PAGE_COMMAND.moveToSpaceRoot:
      return parseMoveToSpaceRoot(pointer.id, path, args);
    default:
      return invalid('The command is not known');
  }
};

/** A list command at a space addresses the list of its top-level pages; the id in the arguments is the page. */
const parseSpaceList = ({ args, command, path, pointer }: ReadEnvelope): Parsed => {
  if (path.length !== 1 || path[0] !== BLOCK_ROOT_PAGES_PATH)
    return invalid('A command at a space addresses rootPageIds');
  switch (command) {
    case BLOCK_COMMAND.listAfter:
    case BLOCK_COMMAND.listBefore: {
      const side = command === BLOCK_COMMAND.listAfter ? 'after' : 'before';
      const parsed = parseInsertArgs(side, args);
      if (parsed.isFail()) return invalidArguments(parsed.getError());
      const { anchorId, childId } = parsed.getValue();
      return Result.ok({
        blockId: childId,
        command: 'insertRoot',
        placement: { anchorId, side },
        spaceId: pointer.id,
      });
    }
    case BLOCK_COMMAND.listRemove: {
      const parsed = blockListRemoveArgsSchema.safeParse(args);
      if (!parsed.success) return invalidArguments(parsed.error);
      return Result.ok({ blockId: parsed.data.id, command: 'removeRoot', spaceId: pointer.id });
    }
    default:
      return invalid('A space only takes list commands');
  }
};

const parseClientCommand = (envelope: ReadEnvelope): Parsed => {
  if (envelope.pointer.table === BLOCK_SPACE_TABLE) return parseSpaceList(envelope);
  return parseBlockCommand(envelope);
};

const parseBlockCommand = ({ args, command, path, pointer }: ReadEnvelope): Parsed => {
  switch (command) {
    case BLOCK_COMMAND.set:
      return parseSet(pointer.id, path, args);
    case BLOCK_COMMAND.update:
      return parseUpdate(pointer.id, path, args);
    case BLOCK_COMMAND.listAfter:
      return parseListInsert(pointer.id, path, args, 'after');
    case BLOCK_COMMAND.listBefore:
      return parseListInsert(pointer.id, path, args, 'before');
    case BLOCK_COMMAND.listRemove:
      return parseListRemove(pointer.id, path, args);
    case BLOCK_COMMAND.applyText:
      return parseApplyText(pointer.id, path, args);
    case BLOCK_COMMAND.setPermission:
      return parseSetPermission(pointer.id, path, args);
    default:
      return invalid('The command is not known');
  }
};

const isPageCommand = (command: string): boolean => Object.values<string>(BLOCK_PAGE_COMMAND).includes(command);

/** Reads one operation of a request: its envelope first, then the arguments its command takes. */
export const parseBlockOperation = (raw: unknown): Parsed => {
  const envelope = blockOperationEnvelopeSchema.safeParse(raw);
  if (!envelope.success) return invalid('The operation has the wrong shape', toIssues(envelope.error));
  return parseClientCommand(envelope.data);
};

/** The same reading, for the backend itself: the page commands a client cannot send are accepted too. */
export const parseTrustedBlockOperation = (raw: unknown): Parsed => {
  const envelope = blockTrustedOperationEnvelopeSchema.safeParse(raw);
  if (!envelope.success) return invalid('The operation has the wrong shape', toIssues(envelope.error));
  return isPageCommand(envelope.data.command) ? parsePageCommand(envelope.data) : parseClientCommand(envelope.data);
};

const withOperationIndex = (error: DomainError, index: number): DomainError =>
  error instanceof BlockOperationInvalidError
    ? new BlockOperationInvalidError(error.message, { index, issues: error.details })
    : error;

const parseEach = (
  raw: readonly unknown[],
  parseOne: (entry: unknown) => Parsed,
): Result<BlockOperation[], DomainError> => {
  const operations: BlockOperation[] = [];
  for (const [index, entry] of raw.entries()) {
    const parsed = parseOne(entry);
    if (parsed.isFail()) return Result.fail(withOperationIndex(parsed.getError(), index));
    operations.push(parsed.getValue());
  }
  return Result.ok(operations);
};

export const parseBlockOperations = (raw: readonly unknown[]): Result<BlockOperation[], DomainError> =>
  parseEach(raw, parseBlockOperation);

export const parseTrustedBlockOperations = (raw: readonly unknown[]): Result<BlockOperation[], DomainError> =>
  parseEach(raw, parseTrustedBlockOperation);

const listParentId = (parentId: string | null | undefined): string[] =>
  parentId === null || parentId === undefined ? [] : [parentId];

const listReferencedIds = (operation: BlockOperation): string[] => {
  switch (operation.command) {
    case 'create':
      return listParentId(operation.fields.parentId);
    case 'patchFields':
      return listParentId(operation.patch.parentId);
    case 'insertChild':
      return operation.placement.anchorId === null
        ? [operation.childId]
        : [operation.childId, operation.placement.anchorId];
    case 'removeChild':
      return [operation.childId];
    case 'insertRoot':
      return listParentId(operation.placement.anchorId);
    case 'setLifecycle':
      return listParentId(operation.detachFromParentId);
    case 'moveToSpaceRoot':
      return [
        ...listParentId(operation.detachFromParentId),
        ...listParentId(operation.parentId),
        ...listParentId(operation.afterId),
      ];
    default:
      return [];
  }
};

/** Every block an operation names, as a pointer or inside its arguments: the rows to lock and read. */
export const listOperationBlockIds = (operations: readonly BlockOperation[]): string[] => [
  ...new Set(operations.flatMap((operation) => [operation.blockId, ...listReferencedIds(operation)])),
];

const isParentWrite = (operation: BlockOperation): boolean => {
  switch (operation.command) {
    case 'patchFields':
      return operation.patch.parentId !== undefined;
    case 'moveToSpaceRoot':
      return true;
    case 'setLifecycle':
      return operation.detachFromParentId !== null;
    default:
      return false;
  }
};

/** A write of `parentId` may be a move, and moves are serialized per space. */
export const hasParentWrite = (operations: readonly BlockOperation[]): boolean => operations.some(isParentWrite);

const changesRoots = (operation: BlockOperation): boolean => {
  switch (operation.command) {
    case 'create':
      return operation.fields.parentId === null;
    case 'patchFields':
      return operation.patch.parentId !== undefined || operation.patch.alive !== undefined;
    case 'insertRoot':
    case 'removeRoot':
    case 'moveToSpaceRoot':
      return true;
    case 'setLifecycle':
      return operation.detachFromParentId !== null;
    default:
      return false;
  }
};

/** The destination spaces of the pages that move to another space: the spaces besides the one the request names. */
export const listDestinationSpaceIds = (operations: readonly BlockOperation[], spaceId: string): string[] => [
  ...new Set(
    operations.flatMap((operation) =>
      operation.command === 'moveToSpaceRoot' && operation.spaceId !== spaceId ? [operation.spaceId] : [],
    ),
  ),
];

/** The spaces whose lists of top-level pages a transaction may change, so they are held while it runs. */
export const listRootSpaceIds = (operations: readonly BlockOperation[], spaceId: string): string[] => {
  if (!operations.some(changesRoots)) return [];
  const named = operations.flatMap((operation) =>
    operation.command === 'insertRoot' || operation.command === 'removeRoot' ? [operation.spaceId] : [],
  );
  return [...new Set([spaceId, ...named, ...listDestinationSpaceIds(operations, spaceId)])].toSorted();
};

/** The pages that leave their space with their whole branch: the rows to read below them. */
export const listSpaceMoveRoots = (operations: readonly BlockOperation[]): string[] =>
  operations.flatMap((operation) => (operation.command === 'moveToSpaceRoot' ? [operation.blockId] : []));
