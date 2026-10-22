import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { SpaceVisibility } from '@neuma/db';
import { Client } from 'pg';
import request from 'supertest';
import { DATABASE_URL_KEY } from '@/common/constants/env.constants';
import type { PageBlockSearchQuery } from '@/common/types/search.types';
import { SearchRepository } from '@/modules/search/infrastructure/persistence/search.repository';
import { SearchService } from '@/modules/search/search.service';
import type { SearchCandidateRequest } from '@/modules/search/types/search.types';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface PlanNode {
  'Actual Loops'?: number;
  'Index Name'?: string;
  'Node Type': string;
  Plans?: PlanNode[];
  'Relation Name'?: string;
}

interface ExplainRow {
  'QUERY PLAN': { Plan: PlanNode }[];
}

type BlockSeed = Parameters<PrismaService['models']['Block']['createAndCount']>[0][number];

interface RenderedStatement {
  text: string;
  values: unknown[];
}

const PAGE_COUNT = 300;
const BLOCKS_PER_PAGE = 20;
const WORDS_PER_BLOCK = 14;
const VOCABULARY_SIZE = 3000;
const INSERT_BATCH_SIZE = 500;
const SELECTIVE_BLOCK_COUNT = 3;
const PAGE_SIZE = 20;
const TIMED_RUNS = 15;
const PLAN_VECTOR_INDEX = 'Block_searchVector_gin_idx';
const PLAN_TRIGRAM_INDEX = 'Block_text_unaccent_trgm_idx';

/**
 * Upper bound for one page of results, on a 6,300 row table. Measured at a few milliseconds on a laptop; the bound
 * leaves room for a slow CI machine while still failing on a sequential scan or a per-row ancestor walk of the whole
 * match set, which cost several times more.
 */
const SELECTIVE_QUERY_BOUND_MS = 150;
const COMMON_TERM_QUERY_BOUND_MS = 400;

/** Pages that hold one word in their title and body, so that the word is in every page of the space. */
const EVERYWHERE_PAGE_COUNT = 1500;
const EVERYWHERE_QUERY_BOUND_MS = 200;
/** Each ancestor walk is one run of the recursive step; the walks must stay near the page asked for. */
const EVERYWHERE_WALK_BOUND = 600;
const RECURSIVE_NODE_TYPE = 'Recursive Union';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Small deterministic generator, so a failing run can be repeated with the same data. */
const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d_2b_79_f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const buildWord = (random: () => number): string =>
  Array.from({ length: 4 + Math.floor(random() * 6) }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');

const median = (values: readonly number[]): number => {
  const sorted = values.toSorted((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const isRecord = (node: unknown): node is Record<string, unknown> => typeof node === 'object' && node !== null;

/** Writes each bound value as `$n`, so the statement can be planned the way the driver sends it. */
const renderStatement = (ast: unknown): RenderedStatement => {
  const values: unknown[] = [];
  const render = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (!isRecord(node)) return '';
    if (Array.isArray(node.parts)) return node.parts.map(render).join('');
    if (node.kind !== 'param-ref') return '';
    values.push(node.value);
    return `$${String(values.length)}`;
  };
  return { text: render(ast), values };
};

const collectNodes = (node: PlanNode): PlanNode[] => [node, ...(node.Plans ?? []).flatMap(collectNodes)];

describe('Search over blocks: indexes and speed (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let workspaceId: string;
  let adminId: string;
  const viewerEmail = `search-perf-${String(Date.now())}@test.com`;
  const selectiveTerm = 'quillmarsh';
  const commonTerm = 'proyecto';
  const everywhereTerm = 'omnipresente';

  const query = (term: string, extra: Partial<PageBlockSearchQuery> = {}): PageBlockSearchQuery => ({
    limit: PAGE_SIZE,
    query: term,
    userId: adminId,
    userRole: 'ADMIN',
    workspaceId,
    ...extra,
  });

  const timeRuns = async (run: () => Promise<unknown>): Promise<number[]> => {
    await run();
    const durations: number[] = [];
    for (let index = 0; index < TIMED_RUNS; index += 1) {
      const startedAt = performance.now();
      await run();
      durations.push(performance.now() - startedAt);
    }
    return durations;
  };

  const explain = async (candidate: SearchCandidateRequest, isExecuted = false): Promise<PlanNode[]> => {
    const statement = testApp.get(SearchRepository).buildStatement(candidate);
    const rendered = renderStatement(statement.ast);
    const client = new Client({ connectionString: testApp.get(ConfigService).getOrThrow<string>(DATABASE_URL_KEY) });
    await client.connect();
    try {
      const result = await client.query<ExplainRow>({
        text: `EXPLAIN (${isExecuted ? 'ANALYZE, ' : ''}FORMAT JSON) ${rendered.text}`,
        values: rendered.values,
      });
      const plan = result.rows[0]?.['QUERY PLAN'][0]?.Plan;
      if (plan === undefined) throw new Error('EXPLAIN returned no plan');
      return collectNodes(plan);
    } finally {
      await client.end();
    }
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    await createAccount(testApp, { email: viewerEmail, name: 'Search Perf', password: 'plainPassword123' });
    await prisma.models.User.where({ email: viewerEmail }).update({ role: 'ADMIN' });
    adminId = (await prisma.models.User.where({ email: viewerEmail }).first())?.id ?? '';
    const session = await request(testApp.getServer())
      .post('/api/v1/auth/sessions')
      .send({ email: viewerEmail, password: 'plainPassword123' })
      .expect(201);
    const spaceResponse = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${(session.body as { accessToken: string }).accessToken}`)
      .send({
        name: 'search-perf',
        slug: `search-perf-${String(Date.now())}`,
        visibility: SpaceVisibility.PUBLIC_INTERNAL,
      })
      .expect(201);
    const spaceId = (spaceResponse.body as IdResponse).id;
    workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';

    const random = createRandom(20_261_020);
    const vocabulary = Array.from({ length: VOCABULARY_SIZE }, () => buildWord(random));
    const rows: BlockSeed[] = [];
    const author = { createdById: adminId, editedById: adminId, spaceId };
    for (let pageIndex = 0; pageIndex < PAGE_COUNT; pageIndex += 1) {
      const pageId = crypto.randomUUID();
      const blockIds = Array.from({ length: BLOCKS_PER_PAGE }, () => crypto.randomUUID());
      const title = `Pagina ${vocabulary[pageIndex] ?? ''} ${String(pageIndex)}`;
      rows.push({
        ...author,
        children: blockIds,
        id: pageId,
        properties: { title: [{ insert: title }] },
        text: title,
        type: 'page',
      });
      for (const [blockIndex, id] of blockIds.entries()) {
        const words = Array.from(
          { length: WORDS_PER_BLOCK },
          () => vocabulary[Math.floor(random() * VOCABULARY_SIZE)] ?? '',
        );
        if (pageIndex * BLOCKS_PER_PAGE + blockIndex < SELECTIVE_BLOCK_COUNT) words[3] = selectiveTerm;
        if (blockIndex % 2 === 0) words[7] = commonTerm;
        const text = words.join(' ');
        rows.push({
          ...author,
          id,
          parentId: pageId,
          properties: { title: [{ insert: text }] },
          text,
          type: 'paragraph',
        });
      }
    }
    for (let pageIndex = 0; pageIndex < EVERYWHERE_PAGE_COUNT; pageIndex += 1) {
      const pageId = crypto.randomUUID();
      const blockId = crypto.randomUUID();
      const title = `${everywhereTerm} ${String(pageIndex)}`;
      rows.push({
        ...author,
        children: [blockId],
        id: pageId,
        properties: { title: [{ insert: title }] },
        text: title,
        type: 'page',
      });
      rows.push({
        ...author,
        id: blockId,
        parentId: pageId,
        properties: { title: [{ insert: `${everywhereTerm} en el cuerpo` }] },
        text: `${everywhereTerm} en el cuerpo`,
        type: 'paragraph',
      });
    }
    for (let start = 0; start < rows.length; start += INSERT_BATCH_SIZE) {
      await prisma.models.Block.createAndCount(rows.slice(start, start + INSERT_BATCH_SIZE));
    }
    // What autovacuum does in a running system: the planner prices a GIN index from statistics a vacuum records.
    await prisma.runner.execute(prisma.sql`VACUUM (ANALYZE) "Block"`.affectedCount().build());
  }, 120_000);

  afterAll(async () => {
    await testApp.close();
  });

  describe('a selective word', () => {
    const planRequest = (): SearchCandidateRequest => ({
      cursor: null,
      fetchSize: PAGE_SIZE * 2 + 1,
      granularity: 'block',
      matching: 'words',
      query: query(selectiveTerm),
    });

    it('is answered through the vector and trigram indexes, never a sequential scan of the blocks', async () => {
      const nodes = await explain(planRequest());

      const scans = nodes.filter((node) => node['Relation Name'] === 'Block' && node['Node Type'].endsWith('Seq Scan'));
      const indexes = nodes.map((node) => node['Index Name']);
      expect(scans).toEqual([]);
      expect(indexes).toContain(PLAN_VECTOR_INDEX);
      expect(indexes).toContain(PLAN_TRIGRAM_INDEX);
    });

    it('does the same when a page stands for its blocks', async () => {
      const nodes = await explain({ ...planRequest(), granularity: 'page' });

      const scans = nodes.filter((node) => node['Relation Name'] === 'Block' && node['Node Type'].endsWith('Seq Scan'));
      expect(scans).toEqual([]);
    });

    it('finds the three blocks that hold it within the bound', async () => {
      const service = testApp.get(SearchService);

      const durations = await timeRuns(() => service.searchBlocks(query(selectiveTerm)));
      const found = await service.searchBlocks(query(selectiveTerm));

      expect(found.items).toHaveLength(SELECTIVE_BLOCK_COUNT);
      console.info(
        `selective block search: median ${median(durations).toFixed(1)} ms, max ${Math.max(...durations).toFixed(1)} ms`,
      );
      expect(median(durations)).toBeLessThan(SELECTIVE_QUERY_BOUND_MS);
    });

    it('finds the pages that hold it within the bound', async () => {
      const service = testApp.get(SearchService);
      const pageQuery = { ...query(selectiveTerm), contentType: 'PAGE' };

      const durations = await timeRuns(() => service.search({ ...pageQuery, sourceType: 'PAGE' }));

      console.info(
        `selective page search: median ${median(durations).toFixed(1)} ms, max ${Math.max(...durations).toFixed(1)} ms`,
      );
      expect(median(durations)).toBeLessThan(SELECTIVE_QUERY_BOUND_MS);
    });
  });

  describe('a word in every page', () => {
    const planRequest = (granularity: 'block' | 'page'): SearchCandidateRequest => ({
      cursor: null,
      fetchSize: PAGE_SIZE * 2 + 1,
      granularity,
      matching: 'words',
      query: query(everywhereTerm),
    });

    const countAncestorWalks = (nodes: readonly PlanNode[]): number =>
      nodes
        .filter((node) => node['Node Type'] === RECURSIVE_NODE_TYPE)
        .reduce((total, node) => total + (node['Actual Loops'] ?? 1), 0);

    it('walks the ancestors of the best matches only, when a block stands for itself', async () => {
      const nodes = await explain(planRequest('block'), true);

      expect(countAncestorWalks(nodes)).toBeLessThan(EVERYWHERE_WALK_BOUND);
    });

    it('walks the ancestors of the best matches only, when a page stands for its blocks', async () => {
      const nodes = await explain(planRequest('page'), true);

      expect(countAncestorWalks(nodes)).toBeLessThan(EVERYWHERE_WALK_BOUND);
    });

    it('answers one page of pages within the bound', async () => {
      const service = testApp.get(SearchService);
      const pageQuery = { ...query(everywhereTerm), contentType: 'PAGE' };

      const durations = await timeRuns(() => service.search({ ...pageQuery, sourceType: 'PAGE' }));
      const found = await service.search({ ...pageQuery, sourceType: 'PAGE' });

      expect(found.items).toHaveLength(PAGE_SIZE);
      expect(found.nextCursor).toBeDefined();
      console.info(
        `everywhere page search: median ${median(durations).toFixed(1)} ms, max ${Math.max(...durations).toFixed(1)} ms`,
      );
      expect(median(durations)).toBeLessThan(EVERYWHERE_QUERY_BOUND_MS);
    });
  });

  describe('a word in half of all blocks', () => {
    it('still answers one page of results within the bound, from the window of best matches', async () => {
      const service = testApp.get(SearchService);

      const durations = await timeRuns(() => service.searchBlocks(query(commonTerm)));
      const found = await service.searchBlocks(query(commonTerm));

      expect(found.items).toHaveLength(PAGE_SIZE);
      expect(found.nextCursor).toBeDefined();
      console.info(
        `common-term block search: median ${median(durations).toFixed(1)} ms, max ${Math.max(...durations).toFixed(1)} ms`,
      );
      expect(median(durations)).toBeLessThan(COMMON_TERM_QUERY_BOUND_MS);
    });

    it('answers a search that must look at the page of every match within the bound', async () => {
      const service = testApp.get(SearchService);

      const durations = await timeRuns(() => service.searchBlocks(query(commonTerm, { verifiedOnly: true })));

      console.info(
        `common-term verified-only search: median ${median(durations).toFixed(1)} ms, max ${Math.max(...durations).toFixed(1)} ms`,
      );
      expect(median(durations)).toBeLessThan(COMMON_TERM_QUERY_BOUND_MS * 4);
    });
  });
});
