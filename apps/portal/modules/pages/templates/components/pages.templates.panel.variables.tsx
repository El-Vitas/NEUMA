'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { PageSchemaProperty } from '../../collections/types/pages.schema.types';
import { readTemplateWordFor, toggleTemplateVariable } from '../lib/pages.templates.lib';
import type { PagesTemplatesEditing, PageTemplate } from '../types/pages.templates.types';

interface IProps {
  readonly editing: PagesTemplatesEditing;
  readonly properties: readonly PageSchemaProperty[];
  readonly template: PageTemplate;
}

/** A date column can take the day the row is made, and a person column whoever makes it. */
export const PagesTemplatesPanelVariables = ({ editing, properties, template }: IProps) => {
  const t = useTranslations('pages.templates');
  const fillable = properties.filter((property) => readTemplateWordFor(property.type) !== null);
  if (fillable.length === 0) return null;

  return (
    <fieldset className="space-y-1 px-1" data-testid="template-variables">
      <legend className="pb-1 text-muted-foreground text-xs">{t('variablesTitle')}</legend>
      {fillable.map((property) => {
        const word = readTemplateWordFor(property.type);
        const isOn = template.variables[property.key] !== undefined;
        return (
          <label
            className="flex min-h-9 items-center gap-2 text-sm"
            htmlFor={`template-${template.id}-${property.key}`}
            key={property.key}
          >
            <Checkbox
              checked={isOn}
              data-testid={`template-variable-${property.key}`}
              disabled={editing.isPending}
              id={`template-${template.id}-${property.key}`}
              onCheckedChange={(checked) =>
                editing.changeVariables(
                  template,
                  toggleTemplateVariable(template.variables, property.key, checked === true ? word : null),
                )
              }
            />
            <span className="min-w-0 flex-1 truncate">
              {word === '@today'
                ? t('fillToday', { column: property.label })
                : t('fillCreator', { column: property.label })}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};
