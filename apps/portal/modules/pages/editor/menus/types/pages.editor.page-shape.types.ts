export type PageEditorPageShape = 'collection' | 'link';

export interface PageEditorPageShapeTarget {
  readonly chosen: PageEditorPageShape;
  readonly label: string | null;
  readonly pageId: string;
  readonly position: number;
  readonly spaceId: string;
}
