import type { PagePropertyValues, PageTemplateVariables, Result } from '@neuma/shared';
import type { z } from 'zod';
import type {
  deleteTemplateInputSchema,
  listTemplatesInputSchema,
  saveTemplateInputSchema,
  templateListOutputSchema,
  templateOutputSchema,
} from '../schemas/mcp.templates.schemas';
import type { McpActor, McpRefusal } from './mcp.collections.types';

export type McpListTemplatesInput = z.infer<typeof listTemplatesInputSchema>;
export type McpSaveTemplateInput = z.infer<typeof saveTemplateInputSchema>;
export type McpDeleteTemplateInput = z.infer<typeof deleteTemplateInputSchema>;
export type McpTemplateOutput = z.infer<typeof templateOutputSchema>;
export type McpTemplateListOutput = z.infer<typeof templateListOutputSchema>;

/** A template as the pages module keeps it: values by column key, variables by column key. */
export interface McpStoredTemplate {
  readonly id: string;
  readonly isDefault: boolean;
  readonly propertyValues: PagePropertyValues;
  readonly title: string;
  readonly variables: PageTemplateVariables;
}

export interface McpStoredTemplates {
  readonly defaultTemplateId: string | null;
  readonly templates: readonly McpStoredTemplate[];
}

export interface McpTemplateChange {
  readonly content?: unknown;
  readonly isDefault?: boolean;
  readonly propertyValues?: PagePropertyValues;
  readonly title?: string;
  readonly variables?: PageTemplateVariables;
}

export interface McpTemplateService {
  readonly create: (
    input: McpActor & { readonly change: McpTemplateChange; readonly collectionId: string },
  ) => Promise<Result<McpStoredTemplate, McpRefusal>>;
  readonly list: (
    input: McpActor & { readonly collectionId: string },
  ) => Promise<Result<McpStoredTemplates, McpRefusal>>;
  readonly remove: (
    input: McpActor & { readonly collectionId: string; readonly templateId: string },
  ) => Promise<Result<boolean, McpRefusal>>;
  readonly update: (
    input: McpActor & {
      readonly change: McpTemplateChange;
      readonly collectionId: string;
      readonly templateId: string;
    },
  ) => Promise<Result<McpStoredTemplate, McpRefusal>>;
}
