import { Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import { isSameJson } from './block.json.domain';
import type {
  BlockChildPlacement,
  BlockCreateOperation,
  BlockEditOperation,
  BlockJsonObject,
  BlockTextEngine,
  BlockTextReplacer,
  WorkingBlock,
} from './block.transaction.domain.types';
import { BlockOperationInvalidError } from './block.transaction.error';

/** A rich text property is an array of segments, so a changed array is a changed text. */
const listChangedTextKeys = (before: BlockJsonObject, after: BlockJsonObject): string[] => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter(
    (key) => (Array.isArray(before[key]) || Array.isArray(after[key])) && !isSameJson(before[key], after[key]),
  );
};

const writeTextKey = (
  block: WorkingBlock,
  key: string,
  replace: BlockTextReplacer,
): Result<WorkingBlock, DomainError> => {
  const value = block.properties[key];
  const delta: readonly unknown[] = Array.isArray(value) ? value : [];
  const replaced = replace({ delta, property: key, textState: block.textState });
  if (replaced.isFail()) return Result.fail(replaced.getError());
  const { [key]: _previous, ...others } = block.properties;
  const properties = Array.isArray(value) ? { ...others, [key]: replaced.getValue().value } : others;
  return Result.ok({ ...block, properties, textState: replaced.getValue().textState });
};

/**
 * The server owns the Yjs state: a direct write of a rich text property becomes a Yjs edit of that property, so
 * the state and `properties` always say the same. A property that is no longer rich text has its text cleared.
 */
const keepTextInStep = (
  before: WorkingBlock,
  after: WorkingBlock,
  replace: BlockTextReplacer,
): Result<WorkingBlock, DomainError> => {
  let current = after;
  for (const key of listChangedTextKeys(before.properties, after.properties)) {
    const written = writeTextKey(current, key, replace);
    if (written.isFail()) return written;
    current = written.getValue();
  }
  return Result.ok(current);
};

/** A block created with rich text gets its Yjs state from the start. */
export const writeCreatedText = (block: WorkingBlock, engine: BlockTextEngine): Result<WorkingBlock, DomainError> =>
  keepTextInStep({ ...block, properties: {} }, block, engine.replace);

/** Inserts the child next to its anchor; a missing anchor sends it to the end (after) or the start (before). */
export const placeChild = (
  children: readonly string[],
  childId: string,
  { anchorId, side }: BlockChildPlacement,
): string[] => {
  const rest = children.filter((id) => id !== childId);
  const anchorIndex = anchorId === null ? -1 : rest.indexOf(anchorId);
  if (anchorIndex === -1) return side === 'after' ? [...rest, childId] : [childId, ...rest];
  const insertAt = side === 'after' ? anchorIndex + 1 : anchorIndex;
  return [...rest.slice(0, insertAt), childId, ...rest.slice(insertAt)];
};

export const createWorkingBlock = (
  { blockId, fields }: BlockCreateOperation,
  author: { readonly now: Date; readonly spaceId: string; readonly userId: string },
): WorkingBlock => ({
  alive: true,
  children: [],
  createdAt: author.now,
  createdById: author.userId,
  editedAt: author.now,
  editedById: author.userId,
  format: fields.format,
  id: blockId,
  lifecycle: 'ACTIVE',
  lockedAt: null,
  parentId: fields.parentId,
  permissions: null,
  properties: fields.properties,
  spaceId: author.spaceId,
  text: '',
  textState: null,
  type: fields.type,
  version: 0,
});

const applyBagEntries = (
  block: WorkingBlock,
  operation: Extract<BlockEditOperation, { command: 'mergeEntries' | 'replaceEntry' }>,
): WorkingBlock => {
  if (operation.command === 'replaceEntry') {
    return { ...block, [operation.bag]: { ...block[operation.bag], [operation.key]: operation.value } };
  }
  const merged = { ...block[operation.bag], ...operation.values };
  const kept = Object.entries(merged).filter(([, value]) => value !== null);
  return { ...block, [operation.bag]: Object.fromEntries(kept) };
};

const applyText = (
  block: WorkingBlock,
  operation: Extract<BlockEditOperation, { command: 'applyText' }>,
  engine: BlockTextEngine,
): Result<WorkingBlock, DomainError> => {
  const prepared = withStateBuilt(block, operation.property, engine.replace);
  if (prepared.isFail()) return prepared;
  const current = prepared.getValue();
  const merged = engine.merge({ property: operation.property, textState: current.textState, update: operation.update });
  if (merged.isFail()) return Result.fail(merged.getError());
  const { textState, value } = merged.getValue();
  return Result.ok({ ...current, properties: { ...current.properties, [operation.property]: value }, textState });
};

/**
 * A block that has text but no Yjs state gets one built from that text, as a server edit, before any client update is
 * merged. The text is never lost; an update built on another history is then refused as out of sync.
 */
const withStateBuilt = (
  block: WorkingBlock,
  property: string,
  replace: BlockTextReplacer,
): Result<WorkingBlock, DomainError> => {
  const stored = block.properties[property];
  const hasTextWithoutState = block.textState === null && Array.isArray(stored) && stored.length > 0;
  return hasTextWithoutState ? writeTextKey(block, property, replace) : Result.ok(block);
};

/** One operation on one existing block. `version`, `text` and authorship are settled once, after all of them. */
export const applyBlockOperation = (
  block: WorkingBlock,
  operation: BlockEditOperation,
  engine: BlockTextEngine,
): Result<WorkingBlock, DomainError> => {
  switch (operation.command) {
    case 'patchFields':
      return keepTextInStep(block, { ...block, ...operation.patch }, engine.replace);
    case 'mergeEntries':
    case 'replaceEntry':
      return keepTextInStep(block, applyBagEntries(block, operation), engine.replace);
    case 'insertChild':
      return Result.ok({ ...block, children: placeChild(block.children, operation.childId, operation.placement) });
    case 'removeChild':
      return Result.ok({ ...block, children: block.children.filter((id) => id !== operation.childId) });
    case 'applyText':
      return applyText(block, operation, engine);
    case 'setPermissions':
      return Result.ok({ ...block, permissions: operation.permissions });
    default:
      return Result.fail(new BlockOperationInvalidError('The operation is not known'));
  }
};
