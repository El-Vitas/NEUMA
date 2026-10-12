export interface PageDateInsert {
  readonly at: string;
}

export interface PageEditorDayOffer {
  readonly at: string;
  readonly id: string;
  readonly labelKey: 'today' | 'tomorrow' | 'yesterday' | 'pick';
}
