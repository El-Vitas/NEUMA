export interface PagesGroupOrdering {
  /** Only declared option values can be moved. */
  readonly canMove: (groupKey: string) => boolean;
  readonly isBusy: boolean;
  readonly move: (groupKey: string, direction: 'EARLIER' | 'LATER') => void;
}
