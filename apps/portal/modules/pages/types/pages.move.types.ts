export interface PageMoveSpace {
  readonly id: string;
  readonly name: string;
}

export interface PageMoveCandidatePage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface PageMoveDestinations {
  readonly pages: readonly PageMoveCandidatePage[];
  readonly spaces: readonly PageMoveSpace[];
}

/** One place a page can be sent: the root of a space, or a page inside one. */
export interface PageMoveDestination {
  readonly id: string;
  readonly pageId: string | null;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly title: string;
}

/** A cross-space move waiting on the person who asked for it, since it would cost someone their access. */
export interface PendingAccessLossPageMove {
  readonly count: number;
  readonly destination: PageMoveDestination;
}
