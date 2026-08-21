export type PagesExportScope = 'branch' | 'page' | 'space';

export interface PagesExportRequest {
  /** What the saved file is named after: the page's title, or the space's name. */
  readonly exportedName: string;
  readonly pageId: null | string;
  readonly scope: PagesExportScope;
  readonly spaceId: string;
}

export interface PagesExportResult {
  readonly exportPages: (request: PagesExportRequest) => void;
  readonly isExporting: boolean;
}
