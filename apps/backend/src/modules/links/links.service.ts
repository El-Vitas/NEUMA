import { Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { LINKS_REPOSITORY } from './constants/links.tokens';
import type {
  BacklinksResult,
  PageLinkProjection,
  PageLinkReconciliationInput,
  PageLinkRepositoryContract,
} from './types/links.types';

@Injectable()
export class LinksService implements PageLinkProjection {
  constructor(@Inject(LINKS_REPOSITORY) private readonly linkRepository: PageLinkRepositoryContract) {}

  async listBacklinks(
    targetPageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<BacklinksResult> {
    return this.linkRepository.listBacklinks(targetPageId, workspaceId, userId, role);
  }

  async reconcileLinks(input: PageLinkReconciliationInput): Promise<void> {
    await this.linkRepository.reconcile(input);
  }
}
