import type { PageSchemaProperty } from './pages.schema.types';

export interface PagesRowCreationInput {
  readonly bandedByKey?: string;
  readonly collectionPageId: string;
  readonly placedByKey: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

export interface PagesRowCreation {
  readonly createRowIn: (placedValue: string, title: string, bandValue?: string) => void;
  readonly isCreating: boolean;
}
