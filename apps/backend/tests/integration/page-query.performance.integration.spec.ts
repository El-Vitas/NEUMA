import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import type { PageFilter, PageQueryOutcome, PageQueryRequest, PageQueryResponse, PageSort } from '@neuma/shared';
import { USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { PageQueryRepository } from '@/modules/pages/infrastructure/persistence/page-query.repository';
import { frag, toRawStatement } from '@/modules/pages/infrastructure/persistence/page-query.sql.lib';
import { PageSchemaService } from '@/modules/pages/page-schema.service';
import type { StatementObserver } from '@/modules/pages/types/page-query.sql.types';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

/** What a table reads at first: ten thousand rows is a collection nobody can read whole. */
const TABLE_ROWS = 10_000;

/** What a board reads: two thousand cards in three columns. */
const BOARD_CARDS = 2000;

/** Rows of other collections, so the table is not all one collection and an index is worth using. */
const NEIGHBOUR_COLLECTIONS = 40;
const NEIGHBOUR_ROWS = 1000;

const CHUNK = 2000;

const RUNS = 25;
const DATABASE_BUDGET_MS = 50;
/** Alone the API answers in 45 to 65 ms; with the whole suite running beside it, it takes twice that. */
const REQUEST_BUDGET_MS = 150;
/** A search reads the text of every row, with no index: 80 ms alone for two reducers over 2,000 rows, up to 230. */
const SEARCH_BUDGET_MS = 300;

const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

const PROPERTIES = [
  TITLE,
  { key: 'status', label: 'Status', options: null, required: false, type: DatabasePropertyType.STATUS },
  {
    key: 'priority',
    label: 'Priority',
    options: ['low', 'mid', 'high'],
    required: false,
    type: DatabasePropertyType.SELECT,
  },
  { key: 'points', label: 'Points', options: null, required: false, type: DatabasePropertyType.NUMBER },
  { key: 'notes', label: 'Notes', options: null, required: false, type: DatabasePropertyType.RICH_TEXT },
  { key: 'site', label: 'Site', options: null, required: false, type: DatabasePropertyType.URL },
  { key: 'contact', label: 'Contact', options: null, required: false, type: DatabasePropertyType.EMAIL },
];

interface SchemaResponse {
  properties: { key: string; options?: { group?: string; id: string; value: string }[] | null }[];
  views: { id: string; name: string }[];
}

const percentile95 = (samples: readonly number[]): number => {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
};

const asRounded = (milliseconds: number): number => Math.round(milliseconds * 10) / 10;

describe('Reading big collections stays fast and uses the indexes (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let repository: PageQueryRepository;
  let schemaService: PageSchemaService;
  let adminToken: string;
  let adminId: string;
  let spaceId: string;
  let tableId = '';
  let boardId = '';
  let schema: SchemaResponse;
  let properties: readonly SchemaPropertyDefinition[];

  const as = () => ({ Authorization: `Bearer ${adminToken}` });

  const optionIds = (key: string): string[] =>
    schema.properties.find((property) => property.key === key)?.options?.map((option) => option.id) ?? [];

  const createCollection = async (title: string): Promise<{ id: string; schema: SchemaResponse }> => {
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as())
      .send({
        content: {
          content: [{ content: [{ text: title, type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title,
      })
      .expect(201);
    const id = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${id}/schema`)
      .set(as())
      .send({
        properties: PROPERTIES,
        views: [
          { configuration: {}, isDefault: true, name: 'Table', type: DatabaseViewType.TABLE },
          { configuration: { groupBy: 'status' }, isDefault: false, name: 'Board', type: DatabaseViewType.BOARD },
        ],
      })
      .expect(201);
    return { id, schema: defined.body as SchemaResponse };
  };

  const seedRows = async (collectionId: string, count: number, withValues: boolean): Promise<void> => {
    const statuses = optionIds('status');
    const priorities = optionIds('priority');
    const ids = Array.from({ length: count }, () => crypto.randomUUID());
    const started = Date.now() - count * 1000;
    for (let from = 0; from < count; from += CHUNK) {
      const rows = ids.slice(from, from + CHUNK).map((id, offset) => {
        const position = from + offset;
        return {
          createdAt: new Date(started + position * 1000),
          createdById: adminId,
          editedById: adminId,
          id,
          parentId: collectionId,
          properties: withValues
            ? {
                values: {
                  contact: `person${String(position)}@example.com`,
                  notes: `Reunión de seguimiento número ${String(position)}`,
                  points: position % 40,
                  priority: priorities[position % priorities.length] ?? null,
                  site: `https://example.com/rows/${String(position)}`,
                  status: statuses[position % statuses.length] ?? null,
                },
              }
            : {},
          spaceId,
          text: `Row ${String(position)}`,
          type: 'page',
        };
      });
      await prisma.models.Block.createAndCount(rows);
    }
    await prisma.models.Block.where({ id: collectionId }).update({ children: ids });
  };

  const run = (body: PageQueryRequest, collectionId: string) =>
    request(testApp.getServer()).post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/query`).set(as()).send(body);

  const timed = async (work: () => Promise<unknown>): Promise<{ p95: number; samples: number[] }> => {
    await work();
    const samples: number[] = [];
    for (let attempt = 0; attempt < RUNS; attempt += 1) {
      const startedAt = performance.now();
      await work();
      samples.push(performance.now() - startedAt);
    }
    return { p95: percentile95(samples), samples };
  };

  const report = (name: string, p95: number): void => {
    // The measured times go to the log of the run: they are the evidence the budget is not a guess.
    process.stdout.write(`PERF ${name}: p95 ${String(asRounded(p95))} ms\n`);
  };

  const planOf = async (
    collectionId: string,
    scopeInput: { filter?: PageFilter | null; sorts?: readonly PageSort[] },
    read: (observer: StatementObserver, scope: Parameters<PageQueryRepository['readPage']>[0]) => Promise<unknown>,
  ): Promise<string> => {
    const plans: string[] = [];
    await repository.inSnapshot(async (runner) => {
      const observer: StatementObserver = async (statement) => {
        const rows = await runner.query(
          toRawStatement(prisma.sql, frag`EXPLAIN ${statement}`)
            .returnsRow({ 'QUERY PLAN': { codecId: 'pg/text@1', nullable: false } })
            .build(),
        );
        plans.push(rows.map((row) => row['QUERY PLAN']).join('\n'));
      };
      const scope = repository.buildScope({
        collectionId,
        deniedIds: [],
        filter: scopeInput.filter ?? null,
        onStatement: observer,
        properties,
        runner,
        search: null,
        signature: 'perf',
        sorts: scopeInput.sorts ?? [],
        unreadableRelations: new Map(),
        viewId: null,
      });
      await read(observer, scope);
    });
    return plans.join('\n');
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    repository = testApp.get(PageQueryRepository);
    schemaService = testApp.get(PageSchemaService);
    const stamp = String(Date.now());
    const email = `perf-admin-${stamp}@test.com`;
    await createAccount(testApp, { email, name: 'Perf Admin', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    const admin = await loginUser(testApp, email, PASSWORD);
    adminToken = admin.accessToken;
    adminId = admin.user.id;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as())
      .send({ name: 'Perf', slug: `perf-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const table = await createCollection('Ten thousand');
    tableId = table.id;
    schema = table.schema;
    const board = await createCollection('Two thousand cards');
    boardId = board.id;
    const workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';
    const read = await schemaService.getSchema(tableId, workspaceId, adminId, USER_ROLE.ADMIN);
    properties = read.getValue().properties;
    await seedRows(tableId, TABLE_ROWS, true);
    const boardSchema = schema;
    schema = board.schema;
    await seedRows(boardId, BOARD_CARDS, true);
    schema = boardSchema;
    for (let neighbour = 0; neighbour < NEIGHBOUR_COLLECTIONS; neighbour += 1) {
      const other = await createCollection(`Neighbour ${String(neighbour)}`);
      await seedRows(other.id, NEIGHBOUR_ROWS, false);
    }
    await prisma.transaction(async (transaction) => {
      await transaction.execute(prisma.sql`ANALYZE "Block"`.affectedCount().build());
    });
  }, 600_000);

  afterAll(async () => {
    await testApp.close();
  });

  describe('a table of ten thousand rows', () => {
    it('answers its first page within the budget, in the database and through the API', async () => {
      const database = await timed(() =>
        repository.inSnapshot((runner) =>
          repository.readPage(
            repository.buildScope({
              collectionId: tableId,
              deniedIds: [],
              filter: null,
              properties,
              runner,
              search: null,
              signature: 'perf',
              sorts: [],
              unreadableRelations: new Map(),
              viewId: null,
            }),
            { cursor: null, limit: 50 },
          ),
        ),
      );
      const api = await timed(async () => {
        await run({ reducers: [{ id: 'rows', kind: 'results', limit: 50 }] }, tableId).expect(200);
      });

      report('table first page (database)', database.p95);
      report('table first page (API)', api.p95);

      expect(database.p95).toBeLessThan(DATABASE_BUDGET_MS);
      expect(api.p95).toBeLessThan(REQUEST_BUDGET_MS);
    });

    it('filters, sorts and counts through the API within the budget', async () => {
      const [low] = optionIds('priority');
      const api = await timed(async () => {
        await run(
          {
            quickFilter: {
              conditions: [{ kind: 'CONDITION', operator: 'IS', propertyKey: 'priority', value: low ?? '' }],
              kind: 'GROUP',
              operator: 'AND',
            },
            reducers: [
              { id: 'rows', kind: 'results', limit: 50 },
              {
                by: 'NONE',
                id: 'counts',
                items: [
                  { calculation: 'COUNT_ALL', id: 'count', propertyKey: null },
                  { calculation: 'SUM', id: 'sum', propertyKey: 'points' },
                ],
                kind: 'aggregations',
              },
            ],
            sorts: [{ direction: 'DESCENDING', propertyKey: 'points' }],
          },
          tableId,
        ).expect(200);
      });

      report('table filter + sort + aggregates (API)', api.p95);

      expect(api.p95).toBeLessThan(REQUEST_BUDGET_MS);
    });

    it('reads deep pages by keyset, as fast as the first one', async () => {
      const first = (await run({ reducers: [{ id: 'rows', kind: 'results', limit: 100 }] }, tableId).expect(200))
        .body as PageQueryResponse;
      let cursor = (first.reducers.rows as PageQueryOutcome & { nextCursor: null | string }).nextCursor;
      for (let page = 0; page < 60 && cursor !== null; page += 1) {
        const next = (
          await run({ reducers: [{ cursor, id: 'rows', kind: 'results', limit: 100 }] }, tableId).expect(200)
        ).body as PageQueryResponse;
        cursor = (next.reducers.rows as PageQueryOutcome & { nextCursor: null | string }).nextCursor;
      }
      const deep = cursor;

      const api = await timed(async () => {
        await run(
          { reducers: [{ cursor: deep ?? undefined, id: 'rows', kind: 'results', limit: 100 }] },
          tableId,
        ).expect(200);
      });

      report('table page 62 by cursor (API)', api.p95);

      expect(deep).not.toBeNull();
      expect(api.p95).toBeLessThan(REQUEST_BUDGET_MS);
    });

    it('reads the first page through an index on the parent, not the whole table', async () => {
      const plan = await planOf(tableId, {}, (_observer, scope) =>
        repository.readPage(scope, { cursor: null, limit: 50 }),
      );

      expect(plan).not.toContain('Seq Scan on "Block"');
      expect(plan).toMatch(/Block_parentId_idx|Block_rows_order_idx/);
    });

    it('filters and sorts through the same index, with the order done by the database', async () => {
      const [low] = optionIds('priority');
      const plan = await planOf(
        tableId,
        {
          filter: {
            conditions: [{ kind: 'CONDITION', operator: 'IS', propertyKey: 'priority', value: low ?? '' }],
            kind: 'GROUP',
            operator: 'AND',
          },
          sorts: [{ direction: 'DESCENDING', propertyKey: 'points' }],
        },
        (_observer, scope) => repository.readPage(scope, { cursor: null, limit: 50 }),
      );

      expect(plan).not.toContain('Seq Scan on "Block"');
      expect(plan).toMatch(/Block_parentId_idx|Block_rows_order_idx/);
    });

    it('counts and calculates through the index too', async () => {
      const plan = await planOf(tableId, {}, (_observer, scope) =>
        repository.readAggregates(scope, [{ calculation: 'SUM', id: 'sum', propertyKey: 'points' }], null),
      );

      expect(plan).not.toContain('Seq Scan on "Block"');
    });
  });

  describe('a board of two thousand cards', () => {
    it('searches the title and the text answers of 2,000 cards, with their counts, within the budget', async () => {
      const api = await timed(async () => {
        const response = await run(
          {
            reducers: [
              { id: 'columns', kind: 'groups', groupBy: 'status', rowsPerGroup: 25 },
              {
                by: 'GROUP',
                groupBy: 'status',
                id: 'counts',
                items: [{ calculation: 'COUNT_ALL', id: 'count', propertyKey: null }],
                kind: 'aggregations',
              },
            ],
            search: 'seguimiento numero 19',
          },
          boardId,
        ).expect(200);
        const counted = (response.body as PageQueryResponse).reducers.counts;
        expect(counted?.kind === 'aggregations' ? counted.distinctRowCount : -1).toBe(111);
      });

      report('board search over title + text answers (API, 2,000 rows)', api.p95);

      expect(api.p95).toBeLessThan(SEARCH_BUDGET_MS);
    });

    it('reads its first cards of every column within the budget', async () => {
      const api = await timed(async () => {
        await run(
          { reducers: [{ id: 'columns', kind: 'groups', groupBy: 'status', rowsPerGroup: 25 }] },
          boardId,
        ).expect(200);
      });

      report('board first cards of each column (API)', api.p95);

      expect(api.p95).toBeLessThan(REQUEST_BUDGET_MS);
    });

    it('counts the cards of every column within the budget', async () => {
      const api = await timed(async () => {
        await run(
          {
            reducers: [
              {
                by: 'GROUP',
                groupBy: 'status',
                id: 'counts',
                items: [{ calculation: 'COUNT_ALL', id: 'count', propertyKey: null }],
                kind: 'aggregations',
              },
            ],
          },
          boardId,
        ).expect(200);
      });

      report('board counts per column (API)', api.p95);

      expect(api.p95).toBeLessThan(REQUEST_BUDGET_MS);
    });

    it('reads one more screenful of a column from its cursor within the budget', async () => {
      const columns = (
        await run(
          { reducers: [{ id: 'columns', kind: 'groups', groupBy: 'status', rowsPerGroup: 25 }] },
          boardId,
        ).expect(200)
      ).body as PageQueryResponse;
      const outcome = columns.reducers.columns;
      if (outcome?.kind !== 'groups') throw new Error('not groups');
      const [column] = outcome.groups;
      if (column?.nextCursor === null || column === undefined) throw new Error('the column has no more cards');

      const api = await timed(async () => {
        await run(
          {
            reducers: [
              {
                cursor: column.nextCursor ?? undefined,
                group: { key: column.key },
                groupBy: 'status',
                id: 'more',
                kind: 'groupResults',
                limit: 25,
              },
            ],
          },
          boardId,
        ).expect(200);
      });

      report('board load more of one column (API)', api.p95);

      expect(api.p95).toBeLessThan(REQUEST_BUDGET_MS);
    });
  });
});
