import type { PageFilterCondition, PageFilterGroupOperator, PageFilterOperator, PageSort } from '@company-brain/shared';
import type { PagePropertyValue, PageSchemaProperty } from './pages.schema.types';

/** Lo que se puede hacer con lo que una vista filtra y ordena, desde la vista misma. */
export interface PagesViewFiltering {
  readonly addCondition: (property: PageSchemaProperty) => void;
  readonly addSort: (propertyKey: string) => void;
  readonly clearConditions: () => void;
  readonly conditions: readonly PageFilterCondition[];
  readonly isSaving: boolean;
  readonly joinOperator: PageFilterGroupOperator;
  readonly removeCondition: (index: number) => void;
  readonly removeSort: (index: number) => void;
  readonly setConditionOperator: (index: number, operator: PageFilterOperator) => void;
  readonly setConditionValue: (index: number, value: PagePropertyValue | null) => void;
  readonly setJoinOperator: (operator: PageFilterGroupOperator) => void;
  readonly sorts: readonly PageSort[];
  readonly toggleSortDirection: (index: number) => void;
}
