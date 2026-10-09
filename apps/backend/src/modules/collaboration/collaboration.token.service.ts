import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import { USER_ROLE } from '@neuma/shared';
import {
  COLLABORATION_PAGE_SERVICE,
  COLLABORATION_TOKEN_SIGNER,
  COLLABORATION_WORKSPACE_SERVICE,
} from './constants/collaboration.constants';
import type {
  CollaborationPageService,
  CollaborationPrincipal,
  CollaborationTokenRequest,
  CollaborationTokenSigner,
  CollaborationWorkspaceService,
} from './types/collaboration.types';

@Injectable()
export class CollaborationTokenService {
  constructor(
    @Inject(COLLABORATION_PAGE_SERVICE) private readonly pagesService: CollaborationPageService,
    @Inject(COLLABORATION_WORKSPACE_SERVICE) private readonly workspacesService: CollaborationWorkspaceService,
    @Inject(COLLABORATION_TOKEN_SIGNER) private readonly tokenAdapter: CollaborationTokenSigner,
  ) {}

  async mint(request: CollaborationTokenRequest, principal: CollaborationPrincipal): Promise<string> {
    const workspace = await this.workspacesService.resolveForUser(principal.sub, principal.role);
    const page = await this.pagesService.getAccessible(request.pageId, workspace.id, principal.sub, principal.role);
    if (page.isFail() || page.getValue().lifecycle !== PageLifecycle.ACTIVE) {
      throw new ForbiddenException('collaboration-access-denied');
    }
    if (request.mode === 'write' && principal.role === USER_ROLE.CLIENT) {
      throw new ForbiddenException('collaboration-access-denied');
    }
    return this.tokenAdapter.signCollaborationToken(
      { id: principal.sub, role: principal.role },
      workspace.id,
      request.pageId,
      request.mode,
    );
  }
}
