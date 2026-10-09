export type PagesExportScope = 'branch' | 'page' | 'pages' | 'space';

export interface PagesExportRequest {
  readonly exportedName: string;
  readonly pageId: null | string;
  readonly pageIds?: readonly string[];
  readonly scope: PagesExportScope;
  readonly spaceId: string;
}

export interface PagesExportResult {
  readonly exportPages: (request: PagesExportRequest) => void;
  readonly isExporting: boolean;
}
