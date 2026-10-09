import type {
  PageChartKind,
  PageChartMeasure,
  PageDateBucket,
  PageOptionColor,
  PagePropertyType,
  PageViewType,
} from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from './pages.schema.types';

export interface PagesSchemaEditor {
  readonly addOption: (key: string, value: string) => void;
  readonly addProperty: (label: string, type: PagePropertyType) => void;
  readonly addView: (name: string, type: PageViewType) => void;
  readonly changeOptionColor: (key: string, value: string, color: PageOptionColor) => void;
  readonly changePropertyType: (key: string, type: PagePropertyType) => void;
  readonly convertView: (viewName: string, type: PageViewType) => void;
  readonly duplicateView: (viewName: string) => void;
  readonly placeViewByDate: (viewName: string, propertyKey: null | string) => void;
  readonly drawViewAs: (viewName: string, kind: PageChartKind) => void;
  readonly measureViewBy: (viewName: string, measure: PageChartMeasure, propertyKey: null | string) => void;
  readonly groupViewByDateBucket: (viewName: string, bucket: PageDateBucket) => void;
  /** A null key means ungrouped, which a table allows and a board does not. */
  readonly groupViewBy: (viewName: string, propertyKey: null | string) => void;
  readonly hasUnsavedChanges: boolean;
  readonly makeViewDefault: (viewName: string) => void;
  readonly subGroupViewBy: (viewName: string, propertyKey: null | string) => void;
  readonly moveProperty: (key: string, direction: 'EARLIER' | 'LATER') => void;
  readonly moveView: (viewName: string, direction: 'EARLIER' | 'LATER') => void;
  readonly isSaving: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly removeOption: (key: string, value: string) => void;
  readonly removeProperty: (key: string) => void;
  readonly removeView: (name: string) => void;
  readonly renameProperty: (key: string, label: string) => void;
  readonly renameView: (viewName: string, name: string) => void;
  readonly setViewIcon: (viewName: string, icon: null | string) => void;
  readonly save: () => void;
  readonly toggleViewEmptyGroups: (viewName: string) => void;
  readonly toggleViewProperty: (viewName: string, propertyKey: string) => void;
  readonly views: readonly PageSchemaView[];
}
