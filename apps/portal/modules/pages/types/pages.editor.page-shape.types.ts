/** The two ways a page can be named inside another: kept in sight, or pointed at. */
export type PageEditorPageShape = 'collection' | 'link';

/** Which page the selected block names, how it is being shown, and where the block stands. */
export interface PageEditorPageShapeTarget {
  readonly chosen: PageEditorPageShape;
  readonly label: string | null;
  readonly pageId: string;
  readonly position: number;
  readonly spaceId: string;
}
