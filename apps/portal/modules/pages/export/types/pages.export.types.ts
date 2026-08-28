export type PagesExportScope = 'branch' | 'page' | 'pages' | 'space';

export interface PagesExportRequest {
  /** What the saved file is named after: the page's title, or the space's name. */
  readonly exportedName: string;
  readonly pageId: null | string;
  /** Which pages somebody picked, when the export is a loose selection. */
  readonly pageIds?: readonly string[];
  readonly scope: PagesExportScope;
  readonly spaceId: string;
}

export interface PagesExportResult {
  readonly exportPages: (request: PagesExportRequest) => void;
  readonly isExporting: boolean;
}
