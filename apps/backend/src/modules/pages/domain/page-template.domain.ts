import { isPageContentBlank, type PageTemplateViewer, Result, resolvePageTemplateVariables } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import { validatePageContent } from './page.domain';
import type { PageContentValidationError } from './page.error';
import { keepWhatThePageSchemaKnows } from './page-schema.domain';
import type { PageRowStart, PageRowTemplate } from './page-template.domain.types';

/**
 * A new row copies what its template holds: the content and the values, and `@today` and `@me` filled for whoever
 * makes the row. What the caller gave wins; a title or a document left empty comes from the template.
 */
export const applyRowTemplate = (
  start: PageRowStart,
  template: PageRowTemplate,
  columns: readonly SchemaPropertyDefinition[],
  viewer: PageTemplateViewer,
): Result<PageRowStart, PageContentValidationError> => {
  const content = validatePageContent(template.content);
  if (content.isFail()) return Result.fail(content.getError());
  const stored = keepWhatThePageSchemaKnows(columns, template.propertyValues);
  const fromVariables = resolvePageTemplateVariables(template.variables, columns, viewer);
  return Result.ok({
    content: isPageContentBlank(start.content) ? content.getValue() : start.content,
    propertyValues: { ...stored, ...fromVariables, ...start.propertyValues },
    title: start.title.trim() === '' ? template.title : start.title,
  });
};
