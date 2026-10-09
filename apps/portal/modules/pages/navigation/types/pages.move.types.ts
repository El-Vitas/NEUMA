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

export interface PageMoveDestination {
  readonly id: string;
  readonly pageId: string | null;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly title: string;
}

export interface PendingAccessLossPageMove {
  readonly count: number;
  readonly destination: PageMoveDestination;
}
