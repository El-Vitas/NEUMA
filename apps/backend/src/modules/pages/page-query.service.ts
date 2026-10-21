import { Inject, Injectable } from '@nestjs/common';
import type {
  PageQueryAggregationsOutcome,
  PageQueryAggregationsReducer,
  PageQueryGroupOutcome,
  PageQueryGroupResultsReducer,
  PageQueryGroupsOutcome,
  PageQueryGroupsReducer,
  PageQueryOutcome,
  PageQueryResultsOutcome,
  PageQueryResultsReducer,
  PageViewConfiguration,
} from '@neuma/shared';
import {
  EMPTY_PAGE_VIEW_CONFIGURATION,
  PAGE_QUERY_LIMITS,
  Result,
  readPageViewConfiguration,
  UNASSIGNED_GROUP_KEY,
} from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../common/domain/schema.domain.types';
import {
  PAGE_QUERY_CLOCK,
  PAGE_QUERY_DEFAULT_TIME_ZONE,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
} from './constants/pages.constants';
import { PageAccessDeniedError, PageSchemaNotFoundError } from './domain/page.error';
import { PageQueryInvalidError, PageQueryViewNotFoundError } from './domain/page-query.error';
import { resolveGrouping } from './domain/page-query.grouping.domain';
import type { GroupingPlan } from './domain/page-query.grouping.domain.types';
import {
  combineFilters,
  listReferencedKeys,
  listRelationTargets,
  readAggregateNumber,
  resolveQueryFilter,
} from './domain/page-query.plan.domain';
import { pageCarriesSchema } from './domain/page-schema.domain';
import { PageChangesRepository } from './infrastructure/persistence/page-changes.repository';
import { groupInclusionSql, groupJoinSql, groupMembershipSql } from './infrastructure/persistence/page-query.group.sql';
import { PageQueryRepository } from './infrastructure/persistence/page-query.repository';
import { allOf, frag, sqlText } from './infrastructure/persistence/page-query.sql.lib';
import type { PageRepositoryContract } from './types/page.types';
import type { GroupAxis, GroupLine, QueryScope, UnreadableRelations } from './types/page-query.sql.types';
import type {
  Axis,
  PageQueryClock,
  PageQueryResult,
  QueryContext,
  ReducerRun,
  RunPageQueryInput,
} from './types/page-query.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';
import { encodeChangesCursor } from './utils/page-changes.cursor.utils';
import { signOrder } from './utils/page-query.cursor.utils';

const toPublicKey = (key: string | null): string => key ?? UNASSIGNED_GROUP_KEY;

const toInternalKey = (key: string): string | null => (key === UNASSIGNED_GROUP_KEY ? null : key);

const clamp = (value: number | undefined, fallback: number, maximum: number): number =>
  Math.min(maximum, Math.max(0, value ?? fallback));

@Injectable()
export class PageQueryService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    @Inject(PAGE_QUERY_CLOCK) private readonly clock: PageQueryClock,
    private readonly queryRepository: PageQueryRepository,
    private readonly changesRepository: PageChangesRepository,
  ) {}

  /** Answers the reducers a request names, for the rows the reader may open and nobody else's. */
  async run(input: RunPageQueryInput): Promise<Result<PageQueryResult, DomainError>> {
    const { pageId, request, role, userId, workspaceId } = input;
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(pageId);
    if (!pageCarriesSchema(schema.properties)) return Result.fail(new PageSchemaNotFoundError());
    const view = this.pickView(schema.views, request.viewId);
    if (view.isFail()) return Result.fail(view.getError());
    const viewer = { role, userId, workspaceId };
    const configuration = this.readConfiguration(view.getValue());
    const timeZone = request.timeZone ?? PAGE_QUERY_DEFAULT_TIME_ZONE;
    const filter = resolveQueryFilter(combineFilters(configuration.filter, request.quickFilter), schema.properties, {
      now: this.clock.now().getTime(),
      timeZone,
      viewerId: userId,
    });
    if (filter.isFail()) return Result.fail(filter.getError());
    const sorts = request.sorts ?? configuration.sorts;
    const items = request.reducers.flatMap((reducer) => (reducer.kind === 'aggregations' ? reducer.items : []));
    const referenced = listReferencedKeys(filter.getValue(), sorts, items, configuration);
    const closed = await this.queryRepository.readClosedRowIds(pageId, viewer, { includeInactive: false });
    if (closed.isFail()) return Result.fail(closed.getError());
    const unreadable = await this.readUnreadableRelations(schema.properties, referenced, viewer);
    if (unreadable.isFail()) return Result.fail(unreadable.getError());
    const search = request.search?.trim() ?? '';
    const properties = new Map(schema.properties.map((property) => [property.key, property]));
    const answered = await this.queryRepository.inSnapshot(async (runner) => {
      const changesCursor = encodeChangesCursor({
        after: null,
        fresh: null,
        since: await this.changesRepository.readWatermark(runner),
      });
      const scope = this.queryRepository.buildScope({
        collectionId: pageId,
        deniedIds: [...new Set([...closed.getValue(), ...(input.excludedRowIds ?? [])])],
        filter: filter.getValue(),
        properties: schema.properties,
        runner,
        search: search === '' ? null : search,
        signature: signOrder(sorts, null),
        sorts,
        timeZone,
        unreadableRelations: unreadable.getValue(),
        viewId: view.getValue()?.id ?? null,
      });
      return {
        changesCursor,
        outcomes: await this.runReducers(request.reducers, { configuration, properties, scope }),
      };
    });
    const { changesCursor, outcomes } = answered;
    if (outcomes.isFail()) return Result.fail(outcomes.getError());
    const ids = [...new Set(Object.values(outcomes.getValue()).flatMap(listOutcomeIds))];
    if (ids.length > PAGE_QUERY_LIMITS.maximumIdsPerResponse) {
      return Result.fail(new PageQueryInvalidError('The reducers ask for more rows than one response carries'));
    }
    const found = await this.pageSchemaRepository.readRowsById(pageId, ids, workspaceId, userId, role);
    return Result.ok({
      attachedFiles: found.attachedFiles,
      changesCursor,
      reducers: outcomes.getValue(),
      relatedRows: found.relatedRows,
      rows: Object.fromEntries(found.rows.map((row) => [row.id, row])),
      spaceId: page.spaceId,
      viewVersion: view.getValue()?.version ?? null,
    });
  }

  private pickView(
    views: readonly SchemaViewDefinition[],
    viewId: string | undefined,
  ): Result<SchemaViewDefinition | null, PageQueryViewNotFoundError> {
    if (viewId === undefined) return Result.ok(null);
    const view = views.find((candidate) => candidate.id === viewId);
    return view === undefined ? Result.fail(new PageQueryViewNotFoundError()) : Result.ok(view);
  }

  private readConfiguration(view: SchemaViewDefinition | null): PageViewConfiguration {
    return view === null ? EMPTY_PAGE_VIEW_CONFIGURATION : readPageViewConfiguration(view.configuration);
  }

  /** For each relation the query touches, the target rows the reader cannot open, so no count includes them. */
  private async readUnreadableRelations(
    properties: readonly SchemaPropertyDefinition[],
    referenced: ReadonlySet<string>,
    viewer: { readonly role: RunPageQueryInput['role']; readonly userId: string; readonly workspaceId: string },
  ): Promise<Result<UnreadableRelations, DomainError>> {
    const unreadable = new Map<string, 'ALL' | readonly string[]>();
    for (const [key, target] of listRelationTargets(properties, referenced)) {
      if (target === null || !(await this.queryRepository.canOpen(target, viewer))) {
        unreadable.set(key, 'ALL');
        continue;
      }
      const closed = await this.queryRepository.readClosedRowIds(target, viewer, { includeInactive: true });
      if (closed.isFail()) return Result.fail(closed.getError());
      unreadable.set(key, closed.getValue());
    }
    return Result.ok(unreadable);
  }

  private async runReducers(
    reducers: readonly (
      | PageQueryAggregationsReducer
      | PageQueryGroupResultsReducer
      | PageQueryGroupsReducer
      | PageQueryResultsReducer
    )[],
    context: QueryContext,
  ): Promise<Result<Readonly<Record<string, PageQueryOutcome>>, DomainError>> {
    const outcomes: Record<string, PageQueryOutcome> = {};
    for (const reducer of reducers) {
      const outcome = await this.runReducer(reducer, context);
      if (outcome.isFail()) return Result.fail(outcome.getError());
      outcomes[reducer.id] = outcome.getValue();
    }
    return Result.ok(outcomes);
  }

  private runReducer(
    reducer:
      | PageQueryAggregationsReducer
      | PageQueryGroupResultsReducer
      | PageQueryGroupsReducer
      | PageQueryResultsReducer,
    context: QueryContext,
  ): Promise<ReducerRun> {
    switch (reducer.kind) {
      case 'results':
        return this.runResults(reducer, context);
      case 'groups':
        return this.runGroups(reducer, context);
      case 'groupResults':
        return this.runGroupResults(reducer, context);
      default:
        return this.runAggregations(reducer, context);
    }
  }

  private async runResults(reducer: PageQueryResultsReducer, context: QueryContext): Promise<ReducerRun> {
    const limit = clamp(reducer.limit, PAGE_QUERY_LIMITS.defaultResultsLimit, PAGE_QUERY_LIMITS.maximumResultsLimit);
    if (limit === 0) return Result.ok({ ids: [], kind: 'results', nextCursor: null } satisfies PageQueryResultsOutcome);
    const page = await this.queryRepository.readPage(context.scope, { cursor: reducer.cursor ?? null, limit });
    if (page.isFail()) return Result.fail(page.getError());
    return Result.ok({ ids: page.getValue().ids, kind: 'results', nextCursor: page.getValue().nextCursor });
  }

  private async runGroupResults(reducer: PageQueryGroupResultsReducer, context: QueryContext): Promise<ReducerRun> {
    const limit = clamp(reducer.limit, PAGE_QUERY_LIMITS.defaultRowsPerGroup, PAGE_QUERY_LIMITS.maximumResultsLimit);
    const axes = this.resolveAxes(context, reducer.groupBy, reducer.subGroupBy, reducer.group.subKey !== undefined);
    if (axes.isFail()) return Result.fail(axes.getError());
    const { main, sub } = axes.getValue();
    if (limit === 0) return Result.ok({ ids: [], kind: 'results', nextCursor: null } satisfies PageQueryResultsOutcome);
    const joins = frag`${groupJoinSql(main, context.scope.context, 'g0')} ${sub === null ? sqlText('') : groupJoinSql(sub, context.scope.context, 'g1')}`;
    const where = allOf([
      groupMembershipSql('g0', toInternalKey(reducer.group.key)),
      ...(sub === null || reducer.group.subKey === undefined
        ? []
        : [groupMembershipSql('g1', toInternalKey(reducer.group.subKey))]),
    ]);
    const page = await this.queryRepository.readPage(context.scope, {
      cursor: reducer.cursor ?? null,
      extraJoins: joins,
      extraWhere: where,
      limit,
    });
    if (page.isFail()) return Result.fail(page.getError());
    return Result.ok({ ids: page.getValue().ids, kind: 'results', nextCursor: page.getValue().nextCursor });
  }

  private resolveAxes(
    context: QueryContext,
    groupBy: string | undefined,
    subGroupBy: string | undefined,
    wantsSub: boolean,
  ): Result<{ main: GroupingPlan; sub: GroupingPlan | null }, PageQueryInvalidError> {
    const { configuration, properties } = context;
    const mainKey = groupBy ?? configuration.groupBy;
    if (mainKey === null) return Result.fail(new PageQueryInvalidError('The view has no property to group by'));
    const main = resolveGrouping(properties, mainKey, configuration.groupByMode, configuration.groupByDateBucket);
    if (main.isFail()) return Result.fail(main.getError());
    const subKey = subGroupBy ?? configuration.subGroupBy;
    if (subKey === null || !wantsSub) return Result.ok({ main: main.getValue(), sub: null });
    const sub = resolveGrouping(properties, subKey, 'OPTION', configuration.groupByDateBucket);
    return sub.isFail() ? Result.fail(sub.getError()) : Result.ok({ main: main.getValue(), sub: sub.getValue() });
  }

  /** The groups an axis shows, in the order they read: the ones declared or found in the rows, then no value. */
  private async readAxis(
    scope: QueryScope,
    plan: GroupingPlan,
    options: { readonly groupLimit: number; readonly hidden: ReadonlySet<string> },
  ): Promise<Axis> {
    const found =
      plan.declaredKeys === null ? await this.queryRepository.readGroupKeys(scope, plan, options.groupLimit) : null;
    const keys = plan.declaredKeys ?? found ?? [];
    const shownKeys = keys.slice(0, options.groupLimit);
    const named = shownKeys.map((key) => ({ isHidden: options.hidden.has(key), key }));
    const unassigned = plan.hasUnassignedGroup
      ? [{ isHidden: options.hidden.has(UNASSIGNED_GROUP_KEY), key: null }]
      : [];
    return { entries: [...named, ...unassigned], hasMore: keys.length > options.groupLimit, plan };
  }

  private async runGroups(reducer: PageQueryGroupsReducer, context: QueryContext): Promise<ReducerRun> {
    const { configuration, scope } = context;
    const axes = this.resolveAxes(context, reducer.groupBy, reducer.subGroupBy, true);
    if (axes.isFail()) return Result.fail(axes.getError());
    const groupLimit = clamp(
      reducer.groupLimit,
      PAGE_QUERY_LIMITS.defaultGroupLimit,
      PAGE_QUERY_LIMITS.maximumGroupLimit,
    );
    const rowsPerGroup = clamp(
      reducer.rowsPerGroup,
      PAGE_QUERY_LIMITS.defaultRowsPerGroup,
      PAGE_QUERY_LIMITS.maximumRowsPerGroup,
    );
    const hidden = new Set([
      ...configuration.hiddenGroups,
      ...(configuration.hidesUnassignedColumn ? [UNASSIGNED_GROUP_KEY] : []),
    ]);
    const main = await this.readAxis(scope, axes.getValue().main, { groupLimit, hidden });
    const subPlan = axes.getValue().sub;
    const sub = subPlan === null ? null : await this.readAxis(scope, subPlan, { groupLimit, hidden: new Set() });
    const shownMain = reducer.includeHidden === true ? main.entries : main.entries.filter((entry) => !entry.isHidden);
    const cells = shownMain.length * (sub?.entries.length ?? 1);
    if (cells * rowsPerGroup > PAGE_QUERY_LIMITS.maximumIdsPerResponse) {
      return Result.fail(new PageQueryInvalidError('The groups ask for more rows than one response carries'));
    }
    const lines = await this.queryRepository.readGroupPages(
      scope,
      this.toAxis(main, shownMain, 'g0'),
      sub === null ? null : this.toAxis(sub, sub.entries, 'g1'),
      rowsPerGroup,
    );
    const groups = this.toGroupOutcomes(shownMain, sub, lines, configuration.hidesEmptyGroups);
    return Result.ok({
      groups,
      hasMoreGroups: main.hasMore || (sub?.hasMore ?? false),
      kind: 'groups',
    } satisfies PageQueryGroupsOutcome);
  }

  private toAxis(axis: Axis, shown: Axis['entries'], alias: 'g0' | 'g1'): GroupAxis {
    const keys = shown.flatMap((entry) => (entry.key === null ? [] : [entry.key]));
    return {
      inclusion: groupInclusionSql(
        alias,
        keys,
        shown.some((entry) => entry.key === null),
      ),
      plan: axis.plan,
    };
  }

  private toGroupOutcomes(
    main: Axis['entries'],
    sub: Axis | null,
    lines: readonly GroupLine[],
    hidesEmptyGroups: boolean,
  ): readonly PageQueryGroupOutcome[] {
    const byCell = new Map(lines.map((line) => [JSON.stringify([line.key, line.subKey]), line.page]));
    const subEntries = sub === null ? [{ isHidden: false, key: null as string | null }] : sub.entries;
    const outcomes = main.flatMap((group) =>
      subEntries.map((band): PageQueryGroupOutcome => {
        const page = byCell.get(JSON.stringify([group.key, sub === null ? null : band.key]));
        return {
          ids: page?.ids ?? [],
          isHidden: group.isHidden,
          key: toPublicKey(group.key),
          nextCursor: page?.nextCursor ?? null,
          subKey: sub === null ? null : toPublicKey(band.key),
        };
      }),
    );
    if (!hidesEmptyGroups) return outcomes;
    const filledKeys = new Set(outcomes.filter((outcome) => outcome.ids.length > 0).map((outcome) => outcome.key));
    return outcomes.filter((outcome) => filledKeys.has(outcome.key));
  }

  private async runAggregations(reducer: PageQueryAggregationsReducer, context: QueryContext): Promise<ReducerRun> {
    const axes =
      reducer.by === 'GROUP'
        ? this.resolveAxes(context, reducer.groupBy, reducer.subGroupBy, true)
        : Result.ok({ main: null, sub: null });
    if (axes.isFail()) return Result.fail(axes.getError());
    const { main, sub } = axes.getValue();
    const result = await this.queryRepository.readAggregates(
      context.scope,
      reducer.items,
      main === null ? null : { main, sub },
    );
    const named = (values: readonly (string | null)[]): Record<string, number | null> =>
      Object.fromEntries(reducer.items.map((item, index) => [item.id, readAggregateNumber(values[index] ?? null)]));
    return Result.ok({
      distinctRowCount: result.distinctRowCount,
      groups: result.groups.map((line) => ({
        key: toPublicKey(line.key),
        subKey: line.subKey === null ? null : toPublicKey(line.subKey),
        values: named(line.values),
      })),
      kind: 'aggregations',
      totals: named(result.totals),
    } satisfies PageQueryAggregationsOutcome);
  }
}

const listOutcomeIds = (outcome: PageQueryOutcome): readonly string[] => {
  switch (outcome.kind) {
    case 'results':
      return outcome.ids;
    case 'groups':
      return outcome.groups.flatMap((group) => group.ids);
    default:
      return [];
  }
};
