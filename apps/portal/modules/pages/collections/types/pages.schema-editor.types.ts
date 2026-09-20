import type {
  PageChartKind,
  PageChartMeasure,
  PageDateBucket,
  PageOptionColor,
  PagePropertyType,
  PageViewType,
} from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from './pages.schema.types';

/** What a collection's settings screen can do while somebody is changing the shape. */
export interface PagesSchemaEditor {
  readonly addOption: (key: string, value: string) => void;
  readonly addProperty: (label: string, type: PagePropertyType) => void;
  readonly addView: (name: string, type: PageViewType) => void;
  readonly changeOptionColor: (key: string, value: string, color: PageOptionColor) => void;
  readonly changePropertyType: (key: string, type: PagePropertyType) => void;
  /** La misma vista mirada de otra manera: se queda lo que la clase nueva entiende. */
  readonly convertView: (viewName: string, type: PageViewType) => void;
  /** Otra vista igual que esta, pegada a ella, para cambiarle algo sin perder la de antes. */
  readonly duplicateView: (viewName: string) => void;
  /** Por qué fecha coloca sus filas un calendario. */
  readonly placeViewByDate: (viewName: string, propertyKey: null | string) => void;
  /** Cómo dibuja un gráfico: barras, línea o pastel. */
  readonly drawViewAs: (viewName: string, kind: PageChartKind) => void;
  /** Qué mide un gráfico de cada grupo, y sobre qué número cuando no es contar filas. */
  readonly measureViewBy: (viewName: string, measure: PageChartMeasure, propertyKey: null | string) => void;
  /** En qué tramo caen las filas cuando la vista agrupa por una fecha. */
  readonly groupViewByDateBucket: (viewName: string, bucket: PageDateBucket) => void;
  /** Nada es «sin agrupar», que una tabla admite y un tablero no. */
  readonly groupViewBy: (viewName: string, propertyKey: null | string) => void;
  /** Si lo que se ve en el panel ya no es lo que está guardado. */
  readonly hasUnsavedChanges: boolean;
  readonly makeViewDefault: (viewName: string) => void;
  readonly subGroupViewBy: (viewName: string, propertyKey: null | string) => void;
  /** Un puesto arriba o abajo entre las propiedades de la colección, que es el orden que heredan las vistas. */
  readonly moveProperty: (key: string, direction: 'EARLIER' | 'LATER') => void;
  readonly moveView: (viewName: string, direction: 'EARLIER' | 'LATER') => void;
  readonly isSaving: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly removeOption: (key: string, value: string) => void;
  readonly removeProperty: (key: string) => void;
  readonly removeView: (name: string) => void;
  readonly renameProperty: (key: string, label: string) => void;
  readonly renameView: (viewName: string, name: string) => void;
  /** El emoji con el que se reconoce la vista en su pestaña, o ninguno. */
  readonly setViewIcon: (viewName: string, icon: null | string) => void;
  readonly save: () => void;
  /** Dejar de ver, o volver a ver, los grupos que no tienen ninguna fila. */
  readonly toggleViewEmptyGroups: (viewName: string) => void;
  readonly toggleViewProperty: (viewName: string, propertyKey: string) => void;
  readonly views: readonly PageSchemaView[];
}
