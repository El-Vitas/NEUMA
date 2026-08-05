export interface PageMentionCandidate {
  readonly id: string;
  readonly label: string;
  readonly spaceId: string;
}

export interface PagesMentionSearchResult {
  readonly candidates: readonly PageMentionCandidate[];
  readonly isLoading: boolean;
}
