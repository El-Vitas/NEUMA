/** A stored link as the reads need it: the block that holds it and the page that block lives in. */
export interface StoredLinkEnds {
  readonly sourceBlockId: string;
  readonly sourcePageId: string;
  readonly targetBlockId: string;
}

/** The first mention a page wrote of the target: one row per linking page, however many links it holds. */
export interface BacklinkCandidate {
  readonly sourceBlockId: string;
  readonly sourcePageId: string;
}

export interface BacklinkCandidateSplit {
  readonly confirmedPageIds: ReadonlySet<string>;
  readonly pendingPageIds: readonly string[];
}
