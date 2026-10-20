import { beforeEach, describe, expect, it } from 'bun:test';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PageLifecycle } from '@neuma/db';
import { Result, USER_ROLE } from '@neuma/shared';
import { Logger } from 'nestjs-pino';
import { JwtAuthGuard } from '@/common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '@/common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '@/common/types/auth.types';
import { PageAccessDeniedError, PageLifecycleError } from '@/modules/pages/domain/page.error';
import { PagesBatchController } from '@/modules/pages/pages.batch.controller';
import { PagesService } from '@/modules/pages/pages.service';
import type { PageSummary } from '@/modules/pages/types/page.types';

const buildPage = (id: string, parentId: null | string): PageSummary => ({
  content: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  hasOwnPermissions: false,
  icon: null,
  id,
  lifecycle: PageLifecycle.ACTIVE,
  lockedAt: null,
  order: 0,
  owner: null,
  parentId,
  propertyValues: null,
  spaceId: 'space-a',
  title: id,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
});

const payload: TokenPayload = { email: 'user-a@test.com', name: 'User A', role: USER_ROLE.WORKER, sub: 'user-a' };

interface FakePagesService {
  readonly getAccessible: (pageId: string) => ReturnType<PagesService['getAccessible']>;
  readonly move: (pageId: string) => ReturnType<PagesService['move']>;
  readonly trash: (pageId: string) => ReturnType<PagesService['trash']>;
}

interface FakeLoggerCall {
  readonly context: Record<string, unknown>;
  readonly message: string;
}

const buildTestingModule = async (
  fakePagesService: FakePagesService,
  fakeLogger: { error: (context: Record<string, unknown>, message: string) => void },
): Promise<TestingModule> =>
  Test.createTestingModule({
    controllers: [PagesBatchController],
    providers: [
      { provide: PagesService, useValue: fakePagesService },
      {
        provide: WorkspaceContextService,
        useValue: { resolveForUser: () => Promise.resolve({ id: 'workspace-a', name: 'Workspace' }) },
      },
      { provide: Logger, useValue: fakeLogger },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

describe('PagesBatchController', () => {
  let trashCalls: string[];
  let moveCalls: string[];
  let pagesById: Map<string, PageSummary>;
  let loggedErrors: FakeLoggerCall[];
  let controller: PagesBatchController;

  beforeEach(async () => {
    trashCalls = [];
    moveCalls = [];
    loggedErrors = [];
    pagesById = new Map([
      ['mother', buildPage('mother', null)],
      ['daughter', buildPage('daughter', 'mother')],
      ['stranger', buildPage('stranger', null)],
    ]);

    const fakePagesService: FakePagesService = {
      getAccessible: (pageId) => {
        const page = pagesById.get(pageId);
        return Promise.resolve(page === undefined ? Result.fail(new PageAccessDeniedError()) : Result.ok(page));
      },
      move: (pageId) => {
        moveCalls.push(pageId);
        const page = pagesById.get(pageId);
        return Promise.resolve(page === undefined ? Result.fail(new PageAccessDeniedError()) : Result.ok(page));
      },
      trash: (pageId) => {
        trashCalls.push(pageId);
        if (pageId === 'explodes-here') throw new Error('database connection lost');
        return Promise.resolve(pageId === 'fails-here' ? Result.fail(new PageLifecycleError()) : Result.ok(true));
      },
    };

    const moduleRef = await buildTestingModule(fakePagesService, {
      error: (context, message) => {
        loggedErrors.push({ context, message });
      },
    });
    controller = moduleRef.get(PagesBatchController);
  });

  it('trashes a selected mother once and reports her selected daughter as succeeded without a second call', async () => {
    const outcome = await controller.trash({ pageIds: ['mother', 'daughter'] }, 'mutation-1', payload);

    expect(trashCalls).toEqual(['mother']);
    expect([...outcome.succeededIds].sort()).toEqual(['daughter', 'mother']);
    expect(outcome.failedIds).toEqual([]);
  });

  it('reports a page nobody can reach as failed, without touching the ones that succeed', async () => {
    const outcome = await controller.trash({ pageIds: ['stranger', 'missing-page'] }, 'mutation-2', payload);

    expect(trashCalls).toEqual(['stranger']);
    expect(outcome.succeededIds).toEqual(['stranger']);
    expect(outcome.failedIds).toEqual(['missing-page']);
  });

  it('carries a covered descendant into the failed list when her ancestor could not be trashed', async () => {
    pagesById.set('fails-here', buildPage('fails-here', null));
    pagesById.set('daughter', buildPage('daughter', 'fails-here'));

    const outcome = await controller.trash({ pageIds: ['fails-here', 'daughter'] }, 'mutation-3', payload);

    expect(trashCalls).toEqual(['fails-here']);
    expect([...outcome.failedIds].sort()).toEqual(['daughter', 'fails-here']);
    expect(outcome.succeededIds).toEqual([]);
  });

  it('moves every unrelated top-level page it was given', async () => {
    const outcome = await controller.move({ pageIds: ['mother', 'stranger'] }, 'mutation-4', payload);

    expect(moveCalls.sort()).toEqual(['mother', 'stranger']);
    expect([...outcome.succeededIds].sort()).toEqual(['mother', 'stranger']);
    expect(outcome.failedIds).toEqual([]);
  });

  it('logs the reason a page failed instead of swallowing it, and still finishes the rest of the batch', async () => {
    pagesById.set('explodes-here', buildPage('explodes-here', null));

    const outcome = await controller.trash({ pageIds: ['explodes-here', 'mother'] }, 'mutation-5', payload);

    expect(outcome.failedIds).toEqual(['explodes-here']);
    expect(outcome.succeededIds).toEqual(['mother']);
    expect(loggedErrors).toHaveLength(1);
    expect(loggedErrors[0]?.context).toMatchObject({
      errorMessage: 'database connection lost',
      operation: 'trash',
      pageId: 'explodes-here',
    });
  });
});
