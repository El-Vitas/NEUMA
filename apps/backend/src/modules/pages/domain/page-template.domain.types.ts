import type { PageContent, PageTemplateVariables } from '@neuma/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';

/** What a template gives a new row, read with the eyes of the one who makes the row. */
export interface PageRowTemplate {
  readonly content: unknown;
  readonly propertyValues: SchemaPropertyValues;
  readonly title: string;
  readonly variables: PageTemplateVariables;
}

/** What a new row holds before and after a template is applied. */
export interface PageRowStart {
  readonly content: PageContent;
  readonly propertyValues: Readonly<Record<string, unknown>> | null;
  readonly title: string;
}
