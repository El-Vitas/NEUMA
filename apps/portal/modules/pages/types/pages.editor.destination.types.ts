/** A page blocks can be sent to: who it is and where it lives. */
export interface PageDestination {
  readonly id: string;
  readonly label: string;
  readonly spaceId: string;
}
