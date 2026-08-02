import type { Prisma } from '@company-brain/db/generated';

export interface SearchDocumentInput {
  readonly contentType: string;
  readonly extractedText: string;
  readonly language: null | string;
  readonly pageId: string;
  readonly properties: Prisma.InputJsonValue;
  readonly spaceId: string;
  readonly tags: Prisma.InputJsonValue;
  readonly title: string;
  readonly versionMarker: number;
}

export interface SearchQuery {
  readonly limit: number;
  readonly query: string;
  readonly spaceId?: string;
}

export interface SearchDocumentProjection {
  readonly apply: (input: SearchDocumentInput) => Promise<void>;
}

export interface SearchResult {
  readonly pageId: string;
  readonly title: string;
}

export interface SearchReader {
  readonly search: (query: SearchQuery) => Promise<readonly SearchResult[]>;
}
