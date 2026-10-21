import type { StoredTextPreview } from '../../local-cache/types/local-cache.types';
import { BLOCK_SYNC_COMMAND } from '../constants/block-sync.constants';
import type { BlockWireOperation } from '../types/block-sync.types';

const readTextProperty = (args: unknown): string | null => {
  if (typeof args !== 'object' || args === null || !('property' in args)) return null;
  return typeof args.property === 'string' ? args.property : null;
};

/** The words of a rich text, without marks or embeds. */
export const readPlainText = (richText: unknown): string => {
  if (!Array.isArray(richText)) return '';
  return richText
    .map((segment: unknown) =>
      typeof segment === 'object' && segment !== null && 'insert' in segment && typeof segment.insert === 'string'
        ? segment.insert
        : '',
    )
    .join('');
};

/**
 * The words of each text a transaction writes, as the editor holds them when it is made, so one the server refuses
 * can still be shown to the person who wrote it. A text update alone cannot say them: it only holds what was typed
 * since the server last confirmed the text, chained to characters it does not carry.
 */
export const describeTransactionText = (
  operations: readonly BlockWireOperation[],
  readText: (blockId: string, property: string) => unknown,
): readonly StoredTextPreview[] => {
  const seen = new Set<string>();
  return operations.flatMap((operation) => {
    const property = operation.command === BLOCK_SYNC_COMMAND.applyText ? readTextProperty(operation.args) : null;
    const key = property === null ? '' : `${operation.pointer.id}:${property}`;
    if (property === null || seen.has(key)) return [];
    seen.add(key);
    const text = readPlainText(readText(operation.pointer.id, property));
    return text === '' ? [] : [{ blockId: operation.pointer.id, property, text }];
  });
};
