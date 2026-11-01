import type { BlockRichText, CommentView, DiscussionView } from '@neuma/shared';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';

/** A person named in a draft: the label stands in the text as `@label`. */
export interface DiscussionMention {
  readonly label: string;
  readonly userId: string;
}

export interface DiscussionDraft {
  readonly mentions: readonly DiscussionMention[];
  readonly text: string;
}

/** The word after an `@` the person is writing, and where that `@` stands in the text. */
export interface DiscussionMentionQuery {
  readonly query: string;
  readonly start: number;
}

export interface DiscussionMentionInsertion {
  readonly caret: number;
  readonly draft: DiscussionDraft;
}

export interface PlacedDiscussionMention {
  readonly end: number;
  readonly mention: DiscussionMention;
  readonly start: number;
}

export interface DiscussionKeyPress {
  readonly ctrlKey: boolean;
  readonly key: string;
  readonly metaKey: boolean;
}

export interface DiscussionMentionState {
  readonly isListOpen: boolean;
  readonly optionsCount: number;
  readonly selectedIndex: number;
}

export type DiscussionKeyAnswer =
  | { readonly kind: 'choose' }
  | { readonly kind: 'close' }
  | { readonly kind: 'move'; readonly index: number }
  | { readonly kind: 'none' }
  | { readonly kind: 'submit' };

export interface DiscussionsSummary {
  /** The marks in the text that point at an open discussion. */
  readonly openMarkIds: ReadonlySet<string>;
  /** Open discussions of each block, for the bubble beside it. */
  readonly openCounts: ReadonlyMap<string, number>;
}

export type DiscussionsStatus = 'failed' | 'loading' | 'ready';

/** `reason` is one of the action failure reasons, ready to be worded by the screen. */
export type DiscussionsOutcome<Value> =
  | { readonly isOk: true; readonly value: Value }
  | { readonly isOk: false; readonly reason: string };

export interface PageDiscussionsApi {
  readonly discussions: readonly DiscussionView[];
  readonly edit: (commentId: string, body: BlockRichText) => Promise<DiscussionsOutcome<CommentView>>;
  readonly open: (blockId: string, body: BlockRichText, quote?: string) => Promise<DiscussionsOutcome<DiscussionView>>;
  readonly refresh: () => Promise<void>;
  readonly remove: (commentId: string) => Promise<DiscussionsOutcome<true>>;
  readonly reopen: (discussionId: string) => Promise<DiscussionsOutcome<DiscussionView>>;
  readonly reply: (discussionId: string, body: BlockRichText) => Promise<DiscussionsOutcome<DiscussionView>>;
  readonly resolve: (discussionId: string) => Promise<DiscussionsOutcome<DiscussionView>>;
  readonly status: DiscussionsStatus;
  readonly summary: DiscussionsSummary;
}

/** What the discussion screens need besides the data: who is looking and who can be named. */
export interface PagesDiscussionsContextValue {
  readonly api: PageDiscussionsApi;
  readonly currentUserId: string | null;
  readonly personOptions: readonly PagePersonOption[];
}
