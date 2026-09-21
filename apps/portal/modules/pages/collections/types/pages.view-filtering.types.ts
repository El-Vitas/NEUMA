import type {
  PageFilterGroup,
  PageFilterGroupOperator,
  PageFilterOperator,
  PageSort,
  PageViewCalculation,
} from '@company-brain/shared';
import type { PagePropertyValue, PageSchemaProperty } from './pages.schema.types';

/**
 * Dónde está una condición o un grupo dentro del filtro: qué puesto ocupa en el
 * grupo de arriba, y dentro de ese, cuál en el suyo.
 *
 * Lo guardado no lleva identificadores —el contrato guarda lo que cada condición
 * dice, no cuál es—, así que el sitio hace de nombre.
 */
export type PageFilterPath = readonly number[];

/** Lo que se puede hacer con lo que una vista filtra, ordena y calcula, desde la vista misma. */
export interface PagesViewFiltering {
  readonly addCondition: (path: PageFilterPath, property: PageSchemaProperty) => void;
  readonly addGroup: (path: PageFilterPath) => void;
  readonly addSort: (propertyKey: string) => void;
  /** Qué dice al pie cada columna, por la clave de la propiedad que la columna es. */
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  readonly clearConditions: () => void;
  /** Cuántas condiciones hay puestas en total, estén sueltas o dentro de un grupo. */
  readonly conditionCount: number;
  readonly isSaving: boolean;
  readonly removeNode: (path: PageFilterPath) => void;
  readonly removeSort: (index: number) => void;
  /** Lo que la vista deja pasar, como el árbol que es. */
  readonly root: PageFilterGroup;
  readonly setCalculation: (propertyKey: string, calculation: PageViewCalculation) => void;
  readonly setConditionOperator: (path: PageFilterPath, operator: PageFilterOperator) => void;
  readonly setConditionValue: (path: PageFilterPath, value: PagePropertyValue | null) => void;
  readonly setGroupOperator: (path: PageFilterPath, operator: PageFilterGroupOperator) => void;
  readonly sorts: readonly PageSort[];
  readonly toggleSortDirection: (index: number) => void;
}
