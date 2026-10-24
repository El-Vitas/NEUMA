import { applyPageViewOperation, Result, readPageViewConfiguration } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import { validateSchemaView } from '../../../common/domain/schema-view.domain';
import { authorizeCollectionEdit } from './block.authorization.domain';
import { BlockAccessDeniedError } from './block.error';
import type {
  StoredView,
  ViewOperationEntry,
  ViewPlan,
  ViewPlanInput,
  ViewWrite,
  WorkingView,
} from './block.transaction.domain.types';
import { BlockOperationInvalidError } from './block.transaction.error';
import { EMPTY_VIEW_PLAN } from './block.view-operation.constants';

const startOf = (stored: StoredView): WorkingView => ({
  operationCount: 0,
  state: { configuration: readPageViewConfiguration(stored.configuration), manualOrder: stored.manualOrder },
  stored,
});

const startFrom = (views: readonly StoredView[], viewId: string): WorkingView | null => {
  const stored = views.find((view) => view.id === viewId);
  return stored === undefined ? null : startOf(stored);
};

const applyOne = (
  working: WorkingView,
  entry: ViewOperationEntry,
  schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>,
  createId: () => string,
): Result<WorkingView, DomainError> => {
  const properties = schemas.get(working.stored.pageId) ?? [];
  const applied = applyPageViewOperation(working.state, entry.operation, {
    collectionOrder: working.stored.collectionOrder,
    createId,
    propertyKeys: properties.map((property) => property.key),
  });
  if (applied.isFail()) {
    const { code, message } = applied.getError();
    return Result.fail(new BlockOperationInvalidError(message, { code, command: entry.operation.command }));
  }
  return Result.ok({ ...working, operationCount: working.operationCount + 1, state: applied.getValue() });
};

const toWrite = (
  working: WorkingView,
  schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>,
): Result<ViewWrite, DomainError> => {
  const { configuration } = working.state;
  const validated = validateSchemaView(
    { configuration: { ...configuration }, type: working.stored.type },
    schemas.get(working.stored.pageId) ?? [],
  );
  if (validated.isFail()) return Result.fail(new BlockOperationInvalidError(validated.getError().message));
  return Result.ok({
    configuration,
    id: working.stored.id,
    manualOrder: working.state.manualOrder,
    version: working.stored.version + working.operationCount,
  });
};

/**
 * The operations a client sent to views, applied in order on the views as the transaction holds them. The caller
 * holds the lock that makes read, apply and write one step, so two people who change different keys or different
 * elements of a list never undo each other. A view of a collection the viewer cannot edit answers as a missing one.
 */
export const planViewOperations = (input: ViewPlanInput): Result<ViewPlan, DomainError> => {
  if (input.operations.length === 0) return Result.ok(EMPTY_VIEW_PLAN);
  const working = new Map<string, WorkingView>();
  for (const entry of input.operations) {
    const current = working.get(entry.viewId) ?? startFrom(input.views, entry.viewId);
    if (current === null) return Result.fail(new BlockAccessDeniedError());
    const authorized = authorizeCollectionEdit(current.stored.pageId, input.authorization);
    if (authorized.isFail()) return Result.fail(authorized.getError());
    const next = applyOne(current, entry, input.schemas, input.createId);
    if (next.isFail()) return Result.fail(next.getError());
    working.set(entry.viewId, next.getValue());
  }
  const writes: ViewWrite[] = [];
  for (const view of working.values()) {
    const write = toWrite(view, input.schemas);
    if (write.isFail()) return Result.fail(write.getError());
    writes.push(write.getValue());
  }
  return Result.ok({ versions: writes.map(({ id, version }) => ({ id, version })), writes });
};
