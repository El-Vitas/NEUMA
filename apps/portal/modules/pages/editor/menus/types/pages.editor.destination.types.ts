export interface PageDestination {
  readonly id: string;
  readonly label: string;
  readonly spaceId: string;
}

export interface PagePickerWording {
  readonly candidates: string;
  readonly description: string;
  readonly search: string;
  readonly title: string;
}
