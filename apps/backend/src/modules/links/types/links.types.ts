import type { BlockAccessViewer } from '../../../common/types/block-access.types';

export interface LinkedPage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export type BacklinkSourcePage = LinkedPage;

export interface BacklinksResult {
  readonly count: number;
  readonly items: readonly BacklinkSourcePage[];
}

export interface OutgoingLinksResult {
  readonly count: number;
  readonly items: readonly LinkedPage[];
}

export interface LinkRepositoryContract {
  readonly listBacklinks: (targetPageId: string, viewer: BlockAccessViewer) => Promise<BacklinksResult>;
  readonly listOutgoingLinks: (sourcePageId: string, viewer: BlockAccessViewer) => Promise<OutgoingLinksResult>;
}
