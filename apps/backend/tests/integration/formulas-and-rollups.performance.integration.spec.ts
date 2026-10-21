import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { JsonObject } from '@neuma/db';
import { DatabasePropertyType, SpaceVisibility } from '@neuma/db';
import type { PageQueryRequest } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

/** A collection nobody can read whole, each row related to ten rows of another collection of the same size. */
const ORDER_ROWS = 10_000;
const LINE_ROWS = 10_000;
const LINES_PER_ORDER = 10;

const CHUNK = 2000;
const RUNS = 12;

/** ADR 028: a page of rows with their computed values. Measure alone: another heavy process doubles the times. */
const PAGE_BUDGET_MS = 300;
/** ADR 028: filter, sort, group or total by computed columns over 10,000 rows with ten relations each. */
const COMPUTED_QUERY_BUDGET_MS = 600;

const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

const percentile95 = (samples: readonly number[]): number => {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
};

const asRounded = (milliseconds: number): number => Math.round(milliseconds * 10) / 10;

describe('Formulas and rollups over 10,000 rows with relations (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let spaceId: string;
  let ordersId = '';
  let linesId = '';

  const as = () => ({ Authorization: `Bearer ${adminToken}` });

  const createCollection = async (title: string): Promise<string> => {
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
    return (page.body as { id: string }).id;
  };

  const seed = async (
    collectionId: string,
    count: number,
    valuesOf: (position: number) => JsonObject,
  ): Promise<readonly string[]> => {
    const ids = Array.from({ length: count }, () => crypto.randomUUID());
    const started = Date.now() - count * 1000;
    for (let from = 0; from < count; from += CHUNK) {
      await prisma.models.Block.createAndCount(
        ids.slice(from, from + CHUNK).map((id, offset) => ({
          createdAt: new Date(started + (from + offset) * 1000),
          createdById: adminId,
          editedById: adminId,
          id,
          parentId: collectionId,
          properties: { values: valuesOf(from + offset) },
          spaceId,
          text: `Row ${String(from + offset)}`,
          type: 'page',
        })),
      );
    }
    await prisma.models.Block.where({ id: collectionId }).update({ children: [...ids] });
    return ids;
  };

  const run = (body: PageQueryRequest) =>
    request(testApp.getServer()).post(`/api/v1/spaces/${spaceId}/pages/${ordersId}/query`).set(as()).send(body);

  const timed = async (name: string, body: PageQueryRequest): Promise<number> => {
    const first = await run(body);
    expect({ body: first.body as unknown, name, status: first.status }).toMatchObject({ status: 200 });
    const samples: number[] = [];
    for (let attempt = 0; attempt < RUNS; attempt += 1) {
      const startedAt = performance.now();
      await run(body).expect(200);
      samples.push(performance.now() - startedAt);
    }
    const p95 = percentile95(samples);
    process.stdout.write(`PERF ${name}: p95 ${String(asRounded(p95))} ms\n`);
    return p95;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const email = `formula-perf-${stamp}@test.com`;
    await createAccount(testApp, { email, name: 'Formula Perf', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    const admin = await loginUser(testApp, email, PASSWORD);
    adminToken = admin.accessToken;
    adminId = admin.user.id;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as())
      .send({ name: 'Formula perf', slug: `formula-perf-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    linesId = await createCollection('Lines');
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${linesId}/schema`)
      .set(as())
      .send({
        properties: [TITLE, { key: 'amount', label: 'Amount', options: null, required: false, type: 'NUMBER' }],
        views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' }],
      })
      .expect(201);
    const lineIds = await seed(linesId, LINE_ROWS, (position) => ({ amount: (position * 37) % 1000 }));
    ordersId = await createCollection('Orders');
    const defined = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${ordersId}/schema`)
      .set(as())
      .send({
        properties: [
          TITLE,
          { key: 'price', label: 'Price', options: null, required: false, type: 'NUMBER' },
          { key: 'quantity', label: 'Quantity', options: null, required: false, type: 'NUMBER' },
          {
            config: { targetCollectionId: linesId },
            key: 'lines',
            label: 'Lines',
            options: null,
            required: false,
            type: 'RELATION',
          },
          {
            formula: 'prop("Price") * prop("Quantity")',
            key: 'total',
            label: 'Total',
            options: null,
            required: false,
            type: 'FORMULA',
          },
          {
            key: 'sum',
            label: 'Lines total',
            options: null,
            required: false,
            rollup: { calculation: 'SUM', relationPropertyKey: 'lines', targetPropertyKey: 'amount' },
            type: 'ROLLUP',
          },
        ],
        views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' }],
      });
    expect({ body: defined.body as unknown, status: defined.status }).toMatchObject({ status: 201 });
    await seed(ordersId, ORDER_ROWS, (position) => ({
      lines: Array.from(
        { length: LINES_PER_ORDER },
        (_unused, index) => lineIds[(position * 7 + index * 13) % LINE_ROWS] ?? '',
      ),
      price: (position % 50) + 1,
      quantity: (position % 9) + 1,
    }));
  }, 300_000);

  afterAll(async () => {
    await testApp.close();
  });

  it('reads a page of rows with their computed values within the budget', async () => {
    const p95 = await timed('page of 50 rows with formulas and rollups', {
      reducers: [{ id: 'rows', kind: 'results', limit: 50 }],
    });

    expect(p95).toBeLessThan(PAGE_BUDGET_MS);
  });

  it('filters by a formula within the budget', async () => {
    const p95 = await timed('filter by a formula', {
      quickFilter: {
        conditions: [{ kind: 'CONDITION', operator: 'IS_GREATER_THAN', propertyKey: 'total', value: 300 }],
        kind: 'GROUP',
        operator: 'AND',
      },
      reducers: [{ id: 'rows', kind: 'results', limit: 50 }],
    });

    expect(p95).toBeLessThan(COMPUTED_QUERY_BUDGET_MS);
  });

  it('sorts by a rollup within the budget', async () => {
    const p95 = await timed('sort by a rollup', {
      reducers: [{ id: 'rows', kind: 'results', limit: 50 }],
      sorts: [{ direction: 'DESCENDING', propertyKey: 'sum' }],
    });

    expect(p95).toBeLessThan(COMPUTED_QUERY_BUDGET_MS);
  });

  it('filters by a rollup, sorts by a formula and totals both within the budget', async () => {
    const p95 = await timed('filter by a rollup, sort by a formula, totals', {
      quickFilter: {
        conditions: [{ kind: 'CONDITION', operator: 'IS_GREATER_THAN', propertyKey: 'sum', value: 4500 }],
        kind: 'GROUP',
        operator: 'AND',
      },
      reducers: [
        { id: 'rows', kind: 'results', limit: 50 },
        {
          by: 'NONE',
          id: 'totals',
          items: [
            { calculation: 'SUM', id: 'sumOfTotals', propertyKey: 'total' },
            { calculation: 'AVERAGE', id: 'averageOfLines', propertyKey: 'sum' },
          ],
          kind: 'aggregations',
        },
      ],
      sorts: [{ direction: 'DESCENDING', propertyKey: 'total' }],
    });

    expect(p95).toBeLessThan(COMPUTED_QUERY_BUDGET_MS);
  });
});
