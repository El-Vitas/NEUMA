/** A date said in relation to the day the view is looked at. */
export type PageRelativeDate =
  | { readonly kind: 'DAY'; readonly offset: -1 | 0 | 1 }
  | { readonly kind: 'WEEK'; readonly offset: -1 | 0 | 1 }
  | { readonly kind: 'MONTH'; readonly offset: -1 | 0 | 1 }
  | { readonly count: number; readonly kind: 'PAST_DAYS' }
  | { readonly count: number; readonly kind: 'NEXT_DAYS' };

/** First and last day of what a relative date covers, as `YYYY-MM-DD`, both included. */
export interface PageDayRange {
  readonly end: string;
  readonly start: string;
}

/** Who looks at the view, when, and where: what a marker needs to become a day or a person. */
export interface PageFilterViewer {
  /** Milliseconds since the epoch. */
  readonly now: number;
  readonly timeZone: string;
  readonly viewerId: string;
}
