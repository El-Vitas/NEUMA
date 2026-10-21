import type { PAGE_TEMPLATE_VARIABLE_VALUES } from '@neuma/shared';
import type { z } from 'zod';
import type { pageTemplateListingSchema, pageTemplateSchema } from '../schemas/pages.templates.schemas';

export type PageTemplate = z.infer<typeof pageTemplateSchema>;
export type PageTemplateListing = z.infer<typeof pageTemplateListingSchema>;
export type PageTemplateWord = (typeof PAGE_TEMPLATE_VARIABLE_VALUES)[number];

export interface PagesTemplatesEditing {
  readonly add: (title: string) => void;
  readonly changeVariables: (template: PageTemplate, variables: Readonly<Record<string, PageTemplateWord>>) => void;
  readonly isPending: boolean;
  readonly remove: (template: PageTemplate) => void;
  readonly rename: (template: PageTemplate, title: string) => void;
  readonly setDefault: (template: PageTemplate | null) => void;
}

export interface PagesTemplateRowCreation {
  /** Undefined takes the default template of the collection; null makes a blank row. */
  readonly createRow: (templateId: null | string | undefined) => void;
  readonly isCreating: boolean;
}
