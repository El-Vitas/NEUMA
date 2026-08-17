/** The calendar day named here. */
export interface PageDateInsert {
  readonly at: string;
}

/** One day offered when naming a day: which day it is, a stable key for the list, and which label names it. */
export interface PageEditorDayOffer {
  readonly at: string;
  readonly id: string;
  readonly labelKey: 'today' | 'tomorrow' | 'yesterday' | 'pick';
}
