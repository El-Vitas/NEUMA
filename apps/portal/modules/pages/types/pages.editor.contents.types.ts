/** A heading of the page: what it says, how deep it sits, and where in the writing it is. */
export interface PageEditorHeading {
  readonly level: number;
  readonly position: number;
  readonly title: string;
}

/** What the index of a page is called when it has nothing to list yet. */
export interface PageEditorContentsLabels {
  readonly empty: string;
  readonly title: string;
}
