import { PAGE_TEMPLATE_VARIABLE_VALUES, type PageTemplateVariables, Result } from '@neuma/shared';
import { PageTemplateInvalidError } from '../domain/page.error';
import { pageTemplateVariablesSchema } from '../schemas/page-template.schemas';
import type { PageTemplateDraft } from '../types/page-template.types';

/** The words a caller left in the columns of a template; one this version does not know is refused. */
export const readTemplateVariables = (
  variables: unknown,
): Result<PageTemplateVariables | null, PageTemplateInvalidError> => {
  if (variables === undefined) return Result.ok(null);
  const parsed = pageTemplateVariablesSchema.safeParse(variables);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.fail(new PageTemplateInvalidError(`A variable is one of ${PAGE_TEMPLATE_VARIABLE_VALUES.join(', ')}`));
};

/** What the request says about a template, with the variables checked. */
export const readTemplateDraft = (body: {
  readonly content?: unknown;
  readonly isDefault?: boolean | undefined;
  readonly propertyValues?: Readonly<Record<string, unknown>> | undefined;
  readonly title?: string | undefined;
  readonly variables?: unknown;
}): Result<PageTemplateDraft, PageTemplateInvalidError> => {
  const variables = readTemplateVariables(body.variables);
  if (variables.isFail()) return Result.fail(variables.getError());
  const checkedVariables = variables.getValue();
  return Result.ok({
    ...(body.content === undefined ? {} : { content: body.content }),
    ...(body.isDefault === undefined ? {} : { isDefault: body.isDefault }),
    ...(body.propertyValues === undefined ? {} : { propertyValues: body.propertyValues }),
    ...(body.title === undefined ? {} : { title: body.title }),
    ...(checkedVariables === null ? {} : { variables: checkedVariables }),
  });
};
