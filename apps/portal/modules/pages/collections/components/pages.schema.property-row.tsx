'use client';

import { isTitlePageProperty, pagePropertyRequiresOptions } from '@company-brain/shared';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import { PagesSchemaOptionsEditor } from './pages.schema.options-editor';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/**
 * One property of a collection, with what can be changed about it.
 *
 * The type is shown but not changed here: turning a date into a number is a
 * question about what happens to every row that already answered, and that is
 * not a question a dropdown should ask in passing.
 */
export const PagesSchemaPropertyRow = ({ editor, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const isTitle = isTitlePageProperty(property.type);

  return (
    <li className="space-y-3 border-border border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t('propertyLabel')}
          className="max-w-64"
          disabled={editor.isSaving}
          onChange={(event) => editor.renameProperty(property.key, event.target.value)}
          value={property.label}
        />
        <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          {t(`types.${property.type}`)}
        </span>
        {isTitle ? (
          <span className="text-muted-foreground text-xs">{t('titlePropertyLocked')}</span>
        ) : (
          <Button
            className={cn('ms-auto min-h-11 min-w-11', FOCUS_RING_CLASS)}
            disabled={editor.isSaving}
            onClick={() => editor.removeProperty(property.key)}
            size="icon"
            title={t('removeProperty', { property: property.label })}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            <span className="sr-only">{t('removeProperty', { property: property.label })}</span>
          </Button>
        )}
      </div>
      {pagePropertyRequiresOptions(property.type) && (
        <PagesSchemaOptionsEditor
          disabled={editor.isSaving}
          onAdd={(value) => editor.addOption(property.key, value)}
          onChangeColor={(value, color) => editor.changeOptionColor(property.key, value, color)}
          onRemove={(value) => editor.removeOption(property.key, value)}
          property={property}
        />
      )}
    </li>
  );
};
