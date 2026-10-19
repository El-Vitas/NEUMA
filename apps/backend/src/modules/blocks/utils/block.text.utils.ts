import { Result } from '@neuma/shared';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';
import type { DomainError } from '../../../common/domain/domain.error';
import { BLOCK_TEXT_STATE_MAX_BYTES } from '../constants/block.transaction.constants';
import type {
  BlockTextEngine,
  BlockTextReplacer,
  BlockTextUpdateApplier,
  BlockTextUpdateOutput,
} from '../domain/block.transaction.domain.types';
import {
  BlockTextOutOfSyncError,
  BlockTextStateTooLargeError,
  BlockTextUpdateInvalidError,
} from '../domain/block.transaction.error';
import type { BlockTextUnit } from '../types/block.transaction.types';

const encodeText = (doc: Doc, property: string): Result<BlockTextUpdateOutput, DomainError> => {
  const nextState = encodeStateAsUpdate(doc);
  if (nextState.byteLength > BLOCK_TEXT_STATE_MAX_BYTES) {
    return Result.fail(new BlockTextStateTooLargeError(BLOCK_TEXT_STATE_MAX_BYTES));
  }
  const delta: unknown = doc.getText(property).toDelta();
  return Result.ok({ textState: nextState, value: delta });
};

/** An update that points at content the block does not have stays pending in Yjs and would be lost on the next save. */
const mergeUpdate = (doc: Doc, update: Uint8Array): Result<void, DomainError> => {
  try {
    applyUpdate(doc, update);
  } catch {
    return Result.fail(new BlockTextUpdateInvalidError('it is not a Yjs update'));
  }
  const isIncomplete = doc.store.pendingStructs !== null || doc.store.pendingDs !== null;
  return isIncomplete ? Result.fail(new BlockTextOutOfSyncError()) : Result.ok(undefined);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(toStableJson).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  const entries = Object.keys(value)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${toStableJson(value[key])}`);
  return `{${entries.join(',')}}`;
};

const toUnits = (segment: unknown): Result<BlockTextUnit[], DomainError> => {
  const invalid = Result.fail<BlockTextUnit[], DomainError>(
    new BlockTextUpdateInvalidError('the text is not rich text'),
  );
  if (!isRecord(segment) || (segment.attributes !== undefined && !isRecord(segment.attributes))) return invalid;
  const attributes = isRecord(segment.attributes) ? segment.attributes : undefined;
  const attributesKey = toStableJson(attributes ?? {});
  const { insert } = segment;
  if (typeof insert === 'string') {
    const characters = insert.split('');
    return Result.ok(
      characters.map((character) => ({
        attributes,
        attributesKey,
        key: `${attributesKey}|s:${character}`,
        value: character,
      })),
    );
  }
  if (!isRecord(insert)) return invalid;
  return Result.ok([{ attributes, attributesKey, key: `${attributesKey}|e:${toStableJson(insert)}`, value: insert }]);
};

const flattenDelta = (delta: readonly unknown[]): Result<BlockTextUnit[], DomainError> => {
  const units: BlockTextUnit[] = [];
  for (const segment of delta) {
    const parsed = toUnits(segment);
    if (parsed.isFail()) return parsed;
    units.push(...parsed.getValue());
  }
  return Result.ok(units);
};

const countSharedPrefix = (current: readonly BlockTextUnit[], next: readonly BlockTextUnit[]): number => {
  let shared = 0;
  while (shared < current.length && shared < next.length && current[shared]?.key === next[shared]?.key) shared += 1;
  return shared;
};

const countSharedSuffix = (
  current: readonly BlockTextUnit[],
  next: readonly BlockTextUnit[],
  prefix: number,
): number => {
  let shared = 0;
  const room = Math.min(current.length, next.length) - prefix;
  while (shared < room && current.at(-1 - shared)?.key === next.at(-1 - shared)?.key) shared += 1;
  return shared;
};

const toInsertOperations = (units: readonly BlockTextUnit[]): Record<string, unknown>[] => {
  const runs: { attributes: BlockTextUnit['attributes']; insert: BlockTextUnit['value']; key: string }[] = [];
  for (const unit of units) {
    const last = runs.at(-1);
    if (typeof unit.value === 'string' && typeof last?.insert === 'string' && last.key === unit.attributesKey) {
      runs[runs.length - 1] = { ...last, insert: last.insert + unit.value };
    } else {
      runs.push({ attributes: unit.attributes, insert: unit.value, key: unit.attributesKey });
    }
  }
  return runs.map(({ attributes, insert }) => ({ attributes, insert }));
};

/** The delta that turns the current text into the new one by editing only the span between their shared ends. */
const buildMinimalEdit = (
  current: readonly BlockTextUnit[],
  next: readonly BlockTextUnit[],
): Record<string, unknown>[] => {
  const prefix = countSharedPrefix(current, next);
  const suffix = countSharedSuffix(current, next, prefix);
  const removed = current.length - prefix - suffix;
  const inserted = toInsertOperations(next.slice(prefix, next.length - suffix));
  return [...(prefix > 0 ? [{ retain: prefix }] : []), ...(removed > 0 ? [{ delete: removed }] : []), ...inserted];
};

const loadDoc = (textState: Uint8Array | null): Doc => {
  const doc = new Doc();
  if (textState !== null) applyUpdate(doc, textState);
  return doc;
};

/**
 * Merges a client update into the block text. The result is the new state to store and the text as a Yjs delta,
 * which is the rich text shape the block keeps in `properties`.
 */
export const applyBlockTextUpdate: BlockTextUpdateApplier = ({ property, textState, update }) => {
  const doc = loadDoc(textState);
  const merged = mergeUpdate(doc, update);
  if (merged.isFail()) return Result.fail(merged.getError());
  return encodeText(doc, property);
};

/**
 * Writes a text that did not come as a Yjs update: the old content is deleted and the new one inserted, as an edit
 * by a fresh client id, so every client that merges the state sees it like any other edit.
 */
export const replaceBlockText: BlockTextReplacer = ({ delta, property, textState }) => {
  const doc = loadDoc(textState);
  const text = doc.getText(property);
  const currentDelta: unknown = text.toDelta();
  const current = flattenDelta(Array.isArray(currentDelta) ? currentDelta : []);
  const next = flattenDelta(delta);
  if (current.isFail()) return Result.fail(current.getError());
  if (next.isFail()) return Result.fail(next.getError());
  const edit = buildMinimalEdit(current.getValue(), next.getValue());
  if (edit.length === 0 && textState !== null) return encodeText(doc, property);
  try {
    doc.transact(() => {
      text.applyDelta(edit);
    });
  } catch {
    return Result.fail(new BlockTextUpdateInvalidError('the text is not rich text'));
  }
  return encodeText(doc, property);
};

export const blockTextEngine: BlockTextEngine = { merge: applyBlockTextUpdate, replace: replaceBlockText };
