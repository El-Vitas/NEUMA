import { Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { LINKS_REPOSITORY } from './constants/links.tokens';
import type { BacklinksResult, LinkRepositoryContract, OutgoingLinksResult } from './types/links.types';

@Injectable()
export class LinksService {
  constructor(@Inject(LINKS_REPOSITORY) private readonly linkRepository: LinkRepositoryContract) {}

  async listBacklinks(
    targetPageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<BacklinksResult> {
    return this.linkRepository.listBacklinks(targetPageId, { role, userId, workspaceId });
  }

  async listOutgoingLinks(
    sourcePageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<OutgoingLinksResult> {
    return this.linkRepository.listOutgoingLinks(sourcePageId, { role, userId, workspaceId });
  }
}
