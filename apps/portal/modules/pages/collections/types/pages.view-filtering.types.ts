import type {
  PageFilterGroup,
  PageFilterGroupOperator,
  PageFilterOperator,
  PageSort,
  PageViewCalculation,
} from '@neuma/shared';
import type { PagePropertyValue, PageSchemaProperty } from './pages.schema.types';

/** Child indexes from the root group down. Stored conditions carry no ids, so the position acts as the identity. */
export type PageFilterPath = readonly number[];

export interface PagesViewFiltering {
  readonly addCondition: (path: PageFilterPath, property: PageSchemaProperty) => void;
  readonly addGroup: (path: PageFilterPath) => void;
  readonly addSort: (propertyKey: string) => void;
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  readonly clearConditions: () => void;
  readonly conditionCount: number;
  readonly isSaving: boolean;
  readonly removeNode: (path: PageFilterPath) => void;
  readonly removeSort: (index: number) => void;
  readonly root: PageFilterGroup;
  readonly setCalculation: (propertyKey: string, calculation: PageViewCalculation) => void;
  readonly setConditionOperator: (path: PageFilterPath, operator: PageFilterOperator) => void;
  readonly setConditionValue: (path: PageFilterPath, value: PagePropertyValue | null) => void;
  readonly setGroupOperator: (path: PageFilterPath, operator: PageFilterGroupOperator) => void;
  readonly sorts: readonly PageSort[];
  readonly toggleSortDirection: (index: number) => void;
}
