import type { DiscussionsSummary } from '../../../discussions/types/pages.discussions.types';

export interface PagesEditorDiscussions {
  readonly anchor: (discussionId: string) => void;
  /** What the page knows of its discussions, for an editor that is created after they were read. */
  readonly readSummary: () => DiscussionsSummary | undefined;
  readonly unanchor: (discussionId: string) => void;
}
