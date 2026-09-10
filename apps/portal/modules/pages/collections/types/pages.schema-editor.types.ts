import type { PageOptionColor, PagePropertyType, PageViewType } from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from './pages.schema.types';

/** What a collection's settings screen can do while somebody is changing the shape. */
export interface PagesSchemaEditor {
  readonly addOption: (key: string, value: string) => void;
  readonly addProperty: (label: string, type: PagePropertyType) => void;
  readonly addView: (name: string, type: PageViewType) => void;
  readonly changeOptionColor: (key: string, value: string, color: PageOptionColor) => void;
  readonly changePropertyType: (key: string, type: PagePropertyType) => void;
  readonly groupViewBy: (viewName: string, propertyKey: string) => void;
  /** Si lo que se ve en el panel ya no es lo que está guardado. */
  readonly hasUnsavedChanges: boolean;
  readonly makeViewDefault: (viewName: string) => void;
  readonly subGroupViewBy: (viewName: string, propertyKey: null | string) => void;
  readonly moveView: (viewName: string, direction: 'EARLIER' | 'LATER') => void;
  readonly isSaving: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly removeOption: (key: string, value: string) => void;
  readonly removeProperty: (key: string) => void;
  readonly removeView: (name: string) => void;
  readonly renameProperty: (key: string, label: string) => void;
  readonly renameView: (viewName: string, name: string) => void;
  readonly save: () => void;
  readonly toggleViewProperty: (viewName: string, propertyKey: string) => void;
  readonly views: readonly PageSchemaView[];
}
