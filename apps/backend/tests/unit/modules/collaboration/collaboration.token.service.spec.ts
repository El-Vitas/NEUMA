import { describe, expect, test } from 'bun:test';
import { PageLifecycle } from '@neuma/db';
import { Result, USER_ROLE } from '@neuma/shared';
import { CollaborationTokenService } from '@/modules/collaboration/collaboration.token.service';
import type {
  CollaborationPageService,
  CollaborationTokenSigner,
  CollaborationWorkspaceService,
} from '@/modules/collaboration/types/collaboration.types';
import type { PageSummary } from '@/modules/pages/types/page.types';

const page: PageSummary = {
  content: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: 'page-1',
  lifecycle: PageLifecycle.ACTIVE,
  lockedAt: null,
  order: 1,
  owner: null,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-1',
  title: 'Page',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
};

const createService = (pageResult = Result.ok(page)) => {
  const pagesService: CollaborationPageService = {
    getAccessible: () => Promise.resolve(pageResult),
  };
  const workspacesService: CollaborationWorkspaceService = {
    resolveForUser: () => Promise.resolve({ id: 'workspace-1', name: 'Workspace' }),
  };
  const tokenAdapter: CollaborationTokenSigner = {
    signCollaborationToken: () => Promise.resolve('short-lived-token'),
  };
  return new CollaborationTokenService(pagesService, workspacesService, tokenAdapter);
};

describe('CollaborationTokenService', () => {
  test('mints read access for a viewer', () => {
    const service = createService();

    expect(service.mint({ pageId: 'page-1', mode: 'read' }, { role: USER_ROLE.CLIENT, sub: 'user-1' })).resolves.toBe(
      'short-lived-token',
    );
  });

  test('rejects write access for a viewer', () => {
    const service = createService();

    expect(
      service.mint({ pageId: 'page-1', mode: 'write' }, { role: USER_ROLE.CLIENT, sub: 'user-1' }),
    ).rejects.toThrow('collaboration-access-denied');
  });

  test('mints write access for an authorized editor', () => {
    const service = createService();

    expect(service.mint({ pageId: 'page-1', mode: 'write' }, { role: USER_ROLE.WORKER, sub: 'user-1' })).resolves.toBe(
      'short-lived-token',
    );
  });

  test('rejects trashed pages', () => {
    const trashedPage = { ...page, lifecycle: PageLifecycle.TRASHED };
    const service = createService(Result.ok(trashedPage));

    expect(service.mint({ pageId: 'page-1', mode: 'read' }, { role: USER_ROLE.WORKER, sub: 'user-1' })).rejects.toThrow(
      'collaboration-access-denied',
    );
  });
});
