import type { PageOptionColor, PagePropertyType } from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from './pages.schema.types';

/** What a collection's settings screen can do while somebody is changing the shape. */
export interface PagesSchemaEditor {
  readonly addOption: (key: string, value: string) => void;
  readonly addProperty: (label: string, type: PagePropertyType) => void;
  readonly changeOptionColor: (key: string, value: string, color: PageOptionColor) => void;
  readonly groupViewBy: (viewName: string, propertyKey: string) => void;
  readonly isSaving: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly removeOption: (key: string, value: string) => void;
  readonly removeProperty: (key: string) => void;
  readonly renameProperty: (key: string, label: string) => void;
  readonly save: () => void;
  readonly toggleViewProperty: (viewName: string, propertyKey: string) => void;
  readonly views: readonly PageSchemaView[];
}
