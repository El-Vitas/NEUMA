import type { BlockRichText } from '@neuma/shared';
import type { Doc } from 'yjs';
import { BLOCK_SYNC_HIGH_SURROGATE_RANGE, BLOCK_SYNC_LOW_SURROGATE_RANGE } from '../constants/block-sync.constants';
import type { BlockDeltaOperation as DeltaOperation, BlockTextUnit as TextUnit } from '../types/block-sync.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const toStableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(toStableJson).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  const entries = Object.keys(value)
    .toSorted((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${toStableJson(value[key])}`);
  return `{${entries.join(',')}}`;
};

const toUnits = (segments: BlockRichText): readonly TextUnit[] =>
  segments.flatMap((segment): TextUnit[] => {
    const attributes: Record<string, unknown> =
      'attributes' in segment && segment.attributes ? { ...segment.attributes } : {};
    const attributesKey = toStableJson(attributes);
    if (typeof segment.insert !== 'string') {
      const embed: Record<string, unknown> = { ...segment.insert };
      return [{ attributes, key: `${attributesKey}|e:${toStableJson(embed)}`, value: embed }];
    }
    return segment.insert.split('').map((character) => ({
      attributes,
      key: `${attributesKey}|s:${character}`,
      value: character,
    }));
  });

const isInRange = (code: number, range: { readonly first: number; readonly last: number }): boolean =>
  code >= range.first && code <= range.last;

const isHighSurrogate = (unit: TextUnit | undefined): boolean =>
  typeof unit?.value === 'string' && isInRange(unit.value.charCodeAt(0), BLOCK_SYNC_HIGH_SURROGATE_RANGE);

const isLowSurrogate = (unit: TextUnit | undefined): boolean =>
  typeof unit?.value === 'string' && isInRange(unit.value.charCodeAt(0), BLOCK_SYNC_LOW_SURROGATE_RANGE);

const countSharedPrefix = (current: readonly TextUnit[], next: readonly TextUnit[]): number => {
  let shared = 0;
  while (shared < current.length && shared < next.length && current[shared]?.key === next[shared]?.key) shared += 1;
  return shared;
};

const countSharedSuffix = (current: readonly TextUnit[], next: readonly TextUnit[], prefix: number): number => {
  let shared = 0;
  const room = Math.min(current.length, next.length) - prefix;
  while (shared < room && current.at(-1 - shared)?.key === next.at(-1 - shared)?.key) shared += 1;
  return shared;
};

const toInsertOperations = (units: readonly TextUnit[]): DeltaOperation[] => {
  const runs: { attributes: Record<string, unknown>; insert: Record<string, unknown> | string }[] = [];
  for (const unit of units) {
    const last = runs.at(-1);
    const canJoin =
      typeof unit.value === 'string' &&
      typeof last?.insert === 'string' &&
      toStableJson(last.attributes) === toStableJson(unit.attributes);
    if (canJoin && last !== undefined && typeof unit.value === 'string' && typeof last.insert === 'string') {
      runs[runs.length - 1] = { attributes: last.attributes, insert: last.insert + unit.value };
    } else {
      runs.push({ attributes: unit.attributes, insert: unit.value });
    }
  }
  return runs;
};

/** The delta that turns the current text into the new one by editing only the span between their shared ends. */
const buildMinimalEdit = (current: readonly TextUnit[], next: readonly TextUnit[]): DeltaOperation[] => {
  let prefix = countSharedPrefix(current, next);
  if (prefix > 0 && isHighSurrogate(current[prefix - 1]) && isHighSurrogate(next[prefix - 1])) prefix -= 1;
  let suffix = countSharedSuffix(current, next, prefix);
  if (suffix > 0 && isLowSurrogate(current.at(-suffix)) && isLowSurrogate(next.at(-suffix))) suffix -= 1;
  const removed = current.length - prefix - suffix;
  const inserted = toInsertOperations(next.slice(prefix, next.length - suffix));
  if (removed === 0 && inserted.length === 0) return [];
  return [...(prefix > 0 ? [{ retain: prefix }] : []), ...(removed > 0 ? [{ delete: removed }] : []), ...inserted];
};

const isBlockRichText = (value: unknown): value is BlockRichText =>
  Array.isArray(value) && value.every((segment) => isRecord(segment) && 'insert' in segment);

export const readTextSegments = (doc: Doc, property: string): BlockRichText => {
  const delta: unknown = doc.getText(property).toDelta();
  return isBlockRichText(delta) ? delta : [];
};

/** Edits the Yjs text of the property to the new segments. False when it already said that. */
export const editTextToSegments = (doc: Doc, property: string, next: BlockRichText): boolean => {
  const edit = buildMinimalEdit(toUnits(readTextSegments(doc, property)), toUnits(next));
  if (edit.length === 0) return false;
  doc.transact(() => {
    doc.getText(property).applyDelta(edit);
  });
  return true;
};

export const mergeStateVectors = (
  first: ReadonlyMap<number, number>,
  second: ReadonlyMap<number, number>,
): Map<number, number> => {
  const merged = new Map(first);
  for (const [client, clock] of second) merged.set(client, Math.max(merged.get(client) ?? 0, clock));
  return merged;
};
