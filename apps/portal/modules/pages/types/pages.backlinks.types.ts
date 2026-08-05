export interface PageBacklink {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface PageBacklinksResult {
  readonly count: number;
  readonly items: readonly PageBacklink[];
}
