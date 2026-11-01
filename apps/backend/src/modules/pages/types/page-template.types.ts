import type { PageTemplateVariables, UserRole } from '@neuma/shared';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import type {
  PageAccessDeniedError,
  PageContentValidationError,
  PagePropertyValidationError,
  PageSchemaNotFoundError,
  PageTemplateInvalidError,
  PageTemplateLimitError,
  PageTemplateNotFoundError,
} from '../domain/page.error';
import type { AccessiblePage } from './page.block.types';

/** Whoever asks: a template is read and written with their rights on its collection. */
export interface PageTemplateActor {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageTemplateSummary {
  readonly id: string;
  readonly isDefault: boolean;
  readonly propertyValues: SchemaPropertyValues;
  readonly title: string;
  readonly variables: PageTemplateVariables;
}

export interface PageTemplateListing {
  readonly defaultTemplateId: null | string;
  readonly templates: readonly PageTemplateSummary[];
}

/** What a template is made of; each part left out stays as it was, or empty for a new one. */
export interface PageTemplateDraft {
  readonly content?: unknown;
  readonly isDefault?: boolean;
  readonly propertyValues?: Readonly<Record<string, unknown>>;
  readonly title?: string;
  readonly variables?: PageTemplateVariables;
}

export type PageTemplateFailure =
  | PageAccessDeniedError
  | PageContentValidationError
  | PagePropertyValidationError
  | PageSchemaNotFoundError
  | PageTemplateInvalidError
  | PageTemplateLimitError
  | PageTemplateNotFoundError;

/** The collection a template belongs to, with the columns its values are checked against. */
export interface PageTemplateCollection {
  readonly collection: AccessiblePage;
  readonly columns: readonly SchemaPropertyDefinition[];
}

export type { PageRowStart, PageRowTemplate } from '../domain/page-template.domain.types';

export type PageRowStartFailure = PageContentValidationError | PagePropertyValidationError | PageTemplateNotFoundError;
