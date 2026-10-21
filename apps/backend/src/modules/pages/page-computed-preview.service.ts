import { Inject, Injectable } from '@nestjs/common';
import { DatabasePropertyType } from '@neuma/db';
import type { PageFormulaOutcome, PageFormulaPropertyInfo } from '@neuma/shared';
import { Result, tracePageFormula } from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import type { SchemaPropertyDefinition } from '../../common/domain/schema.domain.types';
import {
  PAGE_QUERY_DEFAULT_TIME_ZONE,
  PAGE_SCHEMA_REPOSITORY,
  PREVIEW_PROPERTY_KEY,
  PREVIEW_ROW_LIMIT,
} from './constants/pages.constants';
import { PageQueryRepository } from './infrastructure/persistence/page-query.repository';
import { PageComputedService } from './page-computed.service';
import { PageQueryService } from './page-query.service';
import { PageSchemaService } from './page-schema.service';
import type { PreviewComputedRequest, PreviewComputedResult, PreviewedRow } from './types/page-computed.types';
import type { PageRowSummary, PageSchemaRepositoryContract } from './types/page-schema.types';

const toInfo = (property: SchemaPropertyDefinition): PageFormulaPropertyInfo => ({
  key: property.key,
  label: property.label,
  options: property.options,
  resultType: property.computed?.formula?.resultType ?? property.computed?.rollup?.resultType ?? null,
  type: property.type,
});

const failedCell = (key: string): PageFormulaOutcome => ({
  error: { code: 'FORMULA_DEPENDENCY_ERROR', message: `${key} could not be computed` },
  isOk: false,
});

/** Tries a formula or a rollup on real rows without saving it, so it can be corrected before it changes anything. */
@Injectable()
export class PageComputedPreviewService {
  constructor(
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly schemaRepository: PageSchemaRepositoryContract,
    private readonly queryRepository: PageQueryRepository,
    private readonly schemaService: PageSchemaService,
    private readonly queryService: PageQueryService,
    private readonly computedService: PageComputedService,
  ) {}

  async run(request: PreviewComputedRequest): Promise<Result<PreviewComputedResult, DomainError>> {
    const planned = await this.schemaService.previewComputed(request);
    if (planned.isFail()) return Result.fail(planned.getError());
    const { properties, spaceId } = planned.getValue();
    const checked = properties.find((property) => property.key === PREVIEW_PROPERTY_KEY);
    const rows = await this.pickRows(request);
    if (rows.isFail()) return Result.fail(rows.getError());
    const context = { nowMilliseconds: Date.now(), timeZone: PAGE_QUERY_DEFAULT_TIME_ZONE };
    const viewer = { role: request.role, userId: request.userId, workspaceId: request.workspaceId };
    const titleKey = properties.find((property) => property.type === DatabasePropertyType.TITLE)?.key;
    const inputs = rows.getValue().map((row) => ({
      id: row.id,
      values: titleKey === undefined ? (row.propertyValues ?? {}) : { ...row.propertyValues, [titleKey]: row.title },
    }));
    const cells = await this.computedService.compute({
      collectionId: request.pageId,
      context,
      properties,
      rows: inputs,
      viewer,
    });
    if (cells.isFail()) return Result.fail(cells.getError());
    const infos = new Map(properties.map((property) => [property.key, toInfo(property)]));
    const formula = checked?.computed?.formula ?? null;
    const previewed: PreviewedRow[] = rows.getValue().map((row, position) => {
      const rowCells = cells.getValue().get(row.id);
      const outcome = rowCells?.get(PREVIEW_PROPERTY_KEY) ?? failedCell(PREVIEW_PROPERTY_KEY);
      if (!request.trace || formula === null) return { id: row.id, outcome, title: row.title };
      const scope = {
        properties: infos,
        readComputed: (key: string) => rowCells?.get(key) ?? failedCell(key),
        values: inputs[position]?.values ?? {},
      };
      return { id: row.id, outcome, title: row.title, trace: tracePageFormula(formula, scope, context) };
    });
    const reads = (formula?.references ?? []).map((key) => infos.get(key)?.label ?? key);
    const resultType = formula?.resultType ?? checked?.computed?.rollup?.resultType ?? 'TEXT';
    return Result.ok({ reads, resultType, rows: previewed, spaceId });
  }

  /** The rows named, if the reader may open them, or the first rows of the collection. */
  private async pickRows(request: PreviewComputedRequest): Promise<Result<readonly PageRowSummary[], DomainError>> {
    if (request.rowIds === undefined) return this.pickFirstRows(request);
    const viewer = { role: request.role, userId: request.userId, workspaceId: request.workspaceId };
    const closed = await this.queryRepository.readClosedRowIds(request.pageId, viewer, { includeInactive: false });
    if (closed.isFail()) return Result.fail(closed.getError());
    const denied = new Set([...closed.getValue(), ...(request.excludedRowIds ?? [])]);
    const allowed = request.rowIds.filter((id) => !denied.has(id)).slice(0, PREVIEW_ROW_LIMIT);
    const found = await this.schemaRepository.readRowsById(
      request.pageId,
      allowed,
      request.workspaceId,
      request.userId,
      request.role,
    );
    return Result.ok(found.rows);
  }

  private async pickFirstRows(
    request: PreviewComputedRequest,
  ): Promise<Result<readonly PageRowSummary[], DomainError>> {
    const answered = await this.queryService.run({
      excludedRowIds: request.excludedRowIds,
      pageId: request.pageId,
      request: { reducers: [{ id: 'rows', kind: 'results', limit: PREVIEW_ROW_LIMIT }] },
      role: request.role,
      userId: request.userId,
      workspaceId: request.workspaceId,
    });
    if (answered.isFail()) return Result.fail(answered.getError());
    const { reducers, rows } = answered.getValue();
    const outcome = reducers.rows;
    const ids = outcome?.kind === 'results' ? outcome.ids : [];
    return Result.ok(ids.flatMap((id) => rows[id] ?? []));
  }
}
