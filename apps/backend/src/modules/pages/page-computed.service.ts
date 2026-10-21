import { Inject, Injectable } from '@nestjs/common';
import { DatabasePropertyType } from '@neuma/db';
import type {
  PageFormulaCellError,
  PageFormulaOutcome,
  PageFormulaPropertyInfo,
  PageFormulaScalar,
  PageFormulaValue,
  PagePropertyValue,
} from '@neuma/shared';
import {
  isPageComputedPropertyType,
  PAGE_ROLLUP_MAX_DEPTH,
  Result,
  readPagePropertyValue,
  toValueList,
  withPageDerivedValues,
} from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import type { SchemaPropertyDefinition } from '../../common/domain/schema.domain.types';
import { isPropertyValue } from '../../common/domain/schema-property.domain';
import { PAGE_COMPUTED_CANDIDATE_LIMIT, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import { evaluateComputedCells, expandComputedKeys, listRequiredValueKeys } from './domain/page-computed.domain';
import type { ComputedCells, ComputedRowInput } from './domain/page-computed.domain.types';
import type { PageQueryTooManyRestrictedRowsError } from './domain/page-query.error';
import { PageQueryComputedTooLargeError } from './domain/page-query.error';
import { PageComputedRepository } from './infrastructure/persistence/page-computed.repository';
import { PageQueryRepository } from './infrastructure/persistence/page-query.repository';
import type { PageViewer } from './types/page.block.types';
import type {
  AccessResult,
  AttachableRow,
  AttachInput,
  ComputeCellsInput,
  GatheredRollup,
  MaterializedValues,
  MaterializeInput,
  PageComputedSession,
  RollupTarget,
} from './types/page-computed.types';
import type { CandidateRow } from './types/page-query.sql.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';

const toInfo = (property: SchemaPropertyDefinition): PageFormulaPropertyInfo => ({
  key: property.key,
  label: property.label,
  options: property.options,
  resultType: property.computed?.formula?.resultType ?? property.computed?.rollup?.resultType ?? null,
  type: property.type,
});

const listRollupTargets = (properties: readonly SchemaPropertyDefinition[]): readonly string[] => [
  ...new Set(properties.flatMap((property) => property.computed?.rollup?.targetCollectionId ?? [])),
];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What a row stores, from the JSON text the database gave; an entry this version does not understand is left out. */
const readStoredValues = (json: string | null): Readonly<Record<string, PagePropertyValue>> => {
  if (json === null) return {};
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) return {};
  const known: Record<string, PagePropertyValue> = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (isPropertyValue(entry)) known[key] = entry;
  }
  return known;
};

const isScalarList = (value: PageFormulaValue): value is readonly PageFormulaScalar[] => Array.isArray(value);

const toListEntry = (entry: PageFormulaScalar): string => {
  if (typeof entry === 'string') return entry;
  return typeof entry === 'object' ? entry.start : String(entry);
};

/** A value a cell holds so that another collection's rollup can summarise it; a list of mixed values becomes text. */
const toPropertyValue = (value: PageFormulaValue): PagePropertyValue | undefined => {
  if (value === null) return undefined;
  return isScalarList(value) ? value.map(toListEntry) : value;
};

/**
 * Computes the formulas and rollups of the rows of a collection, for one reader, at one moment (ADR 028). The related
 * rows are read in batches, never one by one, and a row the reader cannot open is not read at all, so no cell can
 * count, add or show it.
 */
@Injectable()
export class PageComputedService {
  constructor(
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly schemaRepository: PageSchemaRepositoryContract,
    private readonly queryRepository: PageQueryRepository,
    private readonly computedRepository: PageComputedRepository,
  ) {}

  /** What the computations of one request share, so a collection they reach is read once and not once per step. */
  createSession(): PageComputedSession {
    return { access: new Map(), schemas: new Map() };
  }

  async compute(
    input: ComputeCellsInput,
    session: PageComputedSession = this.createSession(),
  ): Promise<Result<ComputedCells, PageQueryTooManyRestrictedRowsError>> {
    return this.computeAt(input, 0, session);
  }

  /**
   * The values of the computed properties `keys` for every row the scope lets through, as the JSON text of an object by
   * row id (what a query's SQL reads, see `CellContext.computedValues`). More than the candidate limit is refused.
   */
  async materialize(input: MaterializeInput): Promise<Result<MaterializedValues, DomainError>> {
    const candidates = await this.queryRepository.readCandidates(
      input.scope,
      PAGE_COMPUTED_CANDIDATE_LIMIT,
      listRequiredValueKeys(input.properties, new Set(input.keys)),
    );
    if (candidates.length > PAGE_COMPUTED_CANDIDATE_LIMIT) {
      return Result.fail(new PageQueryComputedTooLargeError(PAGE_COMPUTED_CANDIDATE_LIMIT));
    }
    const rows = candidates.map((candidate) => this.toComputedRow(candidate, input.properties));
    const cells = await this.compute(
      {
        collectionId: input.scope.collectionId,
        context: input.context,
        keys: new Set(input.keys),
        properties: input.properties,
        rows,
        viewer: input.viewer,
      },
      input.session,
    );
    if (cells.isFail()) return Result.fail(cells.getError());
    return Result.ok({
      errorCounts: new Map(input.keys.map((key) => [key, this.countErrors(cells.getValue(), rows, key)])),
      values: new Map(input.keys.map((key) => [key, JSON.stringify(this.collectValues(cells.getValue(), rows, key))])),
    });
  }

  /**
   * The collections whose rows the computed columns of a collection read, followed through rollups of rollups, kept to
   * the ones the reader may open. A change in any of them can change a value here without touching these rows, so a
   * client that wants the value fresh listens to them as well (ADR 028).
   */
  async listDependencies(
    collectionId: string,
    properties: readonly SchemaPropertyDefinition[],
    viewer: PageViewer,
    session: PageComputedSession,
  ): Promise<readonly string[]> {
    const found = new Set<string>();
    let pending = listRollupTargets(properties);
    for (let depth = 0; depth < PAGE_ROLLUP_MAX_DEPTH && pending.length > 0; depth += 1) {
      const next: string[] = [];
      for (const targetId of pending) {
        if (targetId === collectionId || found.has(targetId)) continue;
        const access = await this.readAccess(targetId, viewer, session);
        if (access.isFail() || !access.getValue().canOpen) continue;
        found.add(targetId);
        next.push(...listRollupTargets(await this.readSchema(targetId, session)));
      }
      pending = next;
    }
    return [...found];
  }

  private countErrors(cells: ComputedCells, rows: readonly ComputedRowInput[], key: string): number {
    return rows.filter((row) => cells.get(row.id)?.get(key)?.isOk === false).length;
  }

  /** The rows with each computed value among their values, and the cells that failed in `computedErrors`. */
  async attach<TRow extends AttachableRow>(
    rows: readonly TRow[],
    input: AttachInput,
  ): Promise<Result<readonly TRow[], PageQueryTooManyRestrictedRowsError>> {
    if (!input.properties.some((property) => isPageComputedPropertyType(property.type)) || rows.length === 0) {
      return Result.ok(rows);
    }
    const titleKey = input.properties.find((property) => property.type === DatabasePropertyType.TITLE)?.key;
    const inputs = rows.map((row) => ({
      id: row.id,
      values: titleKey === undefined ? (row.propertyValues ?? {}) : { ...row.propertyValues, [titleKey]: row.title },
    }));
    const cells = await this.compute({ ...input, rows: inputs }, input.session);
    if (cells.isFail()) return Result.fail(cells.getError());
    return Result.ok(rows.map((row) => this.withCells(row, cells.getValue().get(row.id))));
  }

  private withCells<TRow extends AttachableRow>(
    row: TRow,
    cells: ReadonlyMap<string, PageFormulaOutcome> | undefined,
  ): TRow {
    if (cells === undefined) return row;
    const values: Record<string, PagePropertyValue> = {};
    const errors: Record<string, PageFormulaCellError> = {};
    for (const [key, outcome] of cells) {
      if (outcome.isOk) {
        const value = toPropertyValue(outcome.value);
        if (value !== undefined) values[key] = value;
      } else errors[key] = outcome.error;
    }
    return {
      ...row,
      computedErrors: Object.keys(errors).length === 0 ? undefined : errors,
      propertyValues: { ...row.propertyValues, ...values },
    };
  }

  private toComputedRow(candidate: CandidateRow, properties: readonly SchemaPropertyDefinition[]): ComputedRowInput {
    const values = withPageDerivedValues(properties, readStoredValues(candidate.valuesJson), {
      createdAt: candidate.createdAt,
      createdById: candidate.createdById,
      editedAt: candidate.editedAt,
      editedById: candidate.editedById,
    });
    const titleKey = properties.find((property) => property.type === DatabasePropertyType.TITLE)?.key;
    return { id: candidate.id, values: titleKey === undefined ? values : { ...values, [titleKey]: candidate.title } };
  }

  private collectValues(
    cells: ComputedCells,
    rows: readonly ComputedRowInput[],
    key: string,
  ): Readonly<Record<string, PagePropertyValue>> {
    const collected: Record<string, PagePropertyValue> = {};
    for (const row of rows) {
      const outcome = cells.get(row.id)?.get(key);
      const value = outcome?.isOk === true ? toPropertyValue(outcome.value) : undefined;
      if (value !== undefined) collected[row.id] = value;
    }
    return collected;
  }

  private async computeAt(
    input: ComputeCellsInput,
    depth: number,
    session: PageComputedSession,
  ): Promise<Result<ComputedCells, PageQueryTooManyRestrictedRowsError>> {
    const keys = expandComputedKeys(input.properties, input.keys);
    const rollupTargets = new Map<string, PageFormulaPropertyInfo>();
    const rollupValues = new Map<string, ReadonlyMap<string, readonly (PagePropertyValue | undefined)[]>>();
    for (const property of input.properties) {
      if (property.type !== DatabasePropertyType.ROLLUP || !keys.has(property.key)) continue;
      const gathered = await this.gatherRollup(property, input, depth, session);
      if (gathered.isFail()) return Result.fail(gathered.getError());
      const rollup = gathered.getValue();
      if (rollup === null) continue;
      rollupTargets.set(property.key, rollup.target);
      rollupValues.set(property.key, rollup.values);
    }
    return Result.ok(
      evaluateComputedCells({
        context: input.context,
        keys,
        properties: input.properties,
        rollupTargets,
        rollupValues,
        rows: input.rows,
      }),
    );
  }

  private readSchema(collectionId: string, session: PageComputedSession): Promise<readonly SchemaPropertyDefinition[]> {
    const known = session.schemas.get(collectionId);
    if (known !== undefined) return known;
    const read = this.schemaRepository.getSchema(collectionId).then((schema) => schema.properties);
    session.schemas.set(collectionId, read);
    return read;
  }

  private readAccess(collectionId: string, viewer: PageViewer, session: PageComputedSession): Promise<AccessResult> {
    const known = session.access.get(collectionId);
    if (known !== undefined) return known;
    const read = this.loadAccess(collectionId, viewer);
    session.access.set(collectionId, read);
    return read;
  }

  private async loadAccess(collectionId: string, viewer: PageViewer): Promise<AccessResult> {
    if (!(await this.queryRepository.canOpen(collectionId, viewer))) {
      return Result.ok({ canOpen: false, closedIds: new Set() });
    }
    const closed = await this.queryRepository.readClosedRowIds(collectionId, viewer, { includeInactive: true });
    return closed.isFail()
      ? Result.fail(closed.getError())
      : Result.ok({ canOpen: true, closedIds: new Set(closed.getValue()) });
  }

  /** The values a rollup summarises, row by row; null when the collection or property it reads is gone. */
  private async gatherRollup(
    property: SchemaPropertyDefinition,
    input: ComputeCellsInput,
    depth: number,
    session: PageComputedSession,
  ): Promise<Result<GatheredRollup | null, PageQueryTooManyRestrictedRowsError>> {
    const rollup = property.computed?.rollup;
    if (rollup === null || rollup === undefined || depth >= PAGE_ROLLUP_MAX_DEPTH) return Result.ok(null);
    const schema = await this.readSchema(rollup.targetCollectionId, session);
    const targetProperty = schema.find((candidate) => candidate.key === rollup.targetPropertyKey);
    if (targetProperty === undefined) return Result.ok(null);
    const access = await this.readAccess(rollup.targetCollectionId, input.viewer, session);
    if (access.isFail()) return Result.fail(access.getError());
    const { canOpen, closedIds } = access.getValue();
    const idsByRow = new Map(
      input.rows.map((row) => [
        row.id,
        canOpen ? toValueList(readPagePropertyValue(row.values, rollup.relationPropertyKey) ?? []) : [],
      ]),
    );
    const target = { closedIds, collectionId: rollup.targetCollectionId, property: targetProperty, schema };
    const targetValues = await this.readTargetValues(
      target,
      [...new Set([...idsByRow.values()].flat())],
      input,
      depth,
      session,
    );
    if (targetValues.isFail()) return Result.fail(targetValues.getError());
    const values = new Map(
      [...idsByRow].map(([rowId, ids]) => [
        rowId,
        ids.filter((id) => targetValues.getValue().has(id)).map((id) => targetValues.getValue().get(id)),
      ]),
    );
    return Result.ok({ target: toInfo(targetProperty), values });
  }

  /** The target property in each live related row the reader may open; a row that holds none maps to `undefined`. */
  private async readTargetValues(
    target: RollupTarget,
    ids: readonly string[],
    input: ComputeCellsInput,
    depth: number,
    session: PageComputedSession,
  ): Promise<Result<ReadonlyMap<string, PagePropertyValue | undefined>, PageQueryTooManyRestrictedRowsError>> {
    if (!isPageComputedPropertyType(target.property.type)) {
      return Result.ok(
        await this.computedRepository.readCellValues(target.collectionId, ids, target.closedIds, target.property),
      );
    }
    const related = await this.computedRepository.readRowsForComputation(
      target.collectionId,
      ids,
      target.closedIds,
      target.schema,
    );
    const cells = await this.computeAt(
      {
        ...input,
        collectionId: target.collectionId,
        keys: new Set([target.property.key]),
        properties: target.schema,
        rows: related,
      },
      depth + 1,
      session,
    );
    if (cells.isFail()) return Result.fail(cells.getError());
    return Result.ok(
      new Map(
        related.map((row) => {
          const outcome = cells.getValue().get(row.id)?.get(target.property.key);
          return [row.id, outcome?.isOk === true ? toPropertyValue(outcome.value) : undefined];
        }),
      ),
    );
  }
}
