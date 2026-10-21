import { PAGE_VIEW_OPERATION_TABLE, Result, readPageViewOperation } from '@neuma/shared';
import { z } from 'zod';
import type { DomainError } from '../../../common/domain/domain.error';
import type { ViewOperationEntry } from '../domain/block.transaction.domain.types';
import { BlockOperationInvalidError } from '../domain/block.transaction.error';
import type { PartitionedOperations } from '../types/block.transaction.types';

const viewEnvelopeSchema = z
  .object({
    args: z.unknown(),
    command: z.string(),
    path: z.array(z.string()),
    pointer: z.object({ id: z.string().min(1).max(64), table: z.literal(PAGE_VIEW_OPERATION_TABLE) }).strict(),
  })
  .strict();

const isViewEnvelope = (raw: unknown): boolean =>
  typeof raw === 'object' &&
  raw !== null &&
  'pointer' in raw &&
  typeof raw.pointer === 'object' &&
  raw.pointer !== null &&
  'table' in raw.pointer &&
  raw.pointer.table === PAGE_VIEW_OPERATION_TABLE;

/** The operations that address a view go to their own reader; the rest are block operations, in the order sent. */
export const partitionOperations = (raw: readonly unknown[]): PartitionedOperations => ({
  blocks: raw.filter((entry) => !isViewEnvelope(entry)),
  views: raw.filter(isViewEnvelope),
});

const invalid = (message: string, index: number, details?: unknown): DomainError =>
  new BlockOperationInvalidError(message, { details, index });

export const parseViewOperations = (raw: readonly unknown[]): Result<ViewOperationEntry[], DomainError> => {
  const entries: ViewOperationEntry[] = [];
  for (const [index, candidate] of raw.entries()) {
    const envelope = viewEnvelopeSchema.safeParse(candidate);
    if (!envelope.success) return Result.fail(invalid('The operation has the wrong shape', index));
    const operation = readPageViewOperation(envelope.data);
    if (operation.isFail()) return Result.fail(invalid(operation.getError(), index));
    entries.push({ operation: operation.getValue(), viewId: envelope.data.pointer.id });
  }
  return Result.ok(entries);
};

/** Every view an operation names, once each, in id order: the rows to lock. */
export const listViewIds = (entries: readonly ViewOperationEntry[]): string[] =>
  [...new Set(entries.map((entry) => entry.viewId))].toSorted();
