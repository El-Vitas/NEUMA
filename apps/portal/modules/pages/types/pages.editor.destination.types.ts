/** A page blocks can be sent to: who it is and where it lives. */
export interface PageDestination {
  readonly id: string;
  readonly label: string;
  readonly spaceId: string;
}

/** What the asking is for, said by whoever asks: the same list of pages answers more than one question. */
export interface PagePickerWording {
  readonly candidates: string;
  readonly description: string;
  readonly search: string;
  readonly title: string;
}
