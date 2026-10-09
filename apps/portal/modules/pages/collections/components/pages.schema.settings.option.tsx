'use client';

import type { PageOptionColor, PagePropertyOption } from '@neuma/shared';
import { PAGE_OPTION_COLOR_VALUES } from '@neuma/shared';
import { Check, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly option: PagePropertyOption;
  readonly property: PageSchemaProperty;
}

export const PagesSchemaSettingsOption = ({ editor, onGo, option, property }: IProps) => {
  const t = useTranslations('pages.collection');

  const choose = (color: PageOptionColor): void => editor.changeOptionColor(property.key, option.value, color);

  return (
    <div className="space-y-3">
      <p className="px-2">
        <span className={cn('rounded-sm px-2 py-0.5 text-sm', readPageOptionColorClass(option.color))}>
          {option.value}
        </span>
      </p>
      <div className="space-y-1 border-border border-t pt-3">
        <p className="px-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">
          {t('optionColorFor', { option: option.value })}
        </p>
        {PAGE_OPTION_COLOR_VALUES.map((candidate) => (
          <button
            aria-pressed={candidate === option.color}
            className={cn(
              'flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted',
              FOCUS_RING_CLASS,
            )}
            disabled={editor.isSaving}
            key={candidate}
            onClick={() => choose(candidate)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn('size-4 shrink-0 rounded-sm border border-border/60', readPageOptionColorClass(candidate))}
            />
            <span className="flex-1 text-foreground">{t(`colors.${candidate}`)}</span>
            {candidate === option.color && <Check aria-hidden="true" className="size-4 text-foreground" />}
          </button>
        ))}
      </div>
      <div className="border-border border-t pt-3">
        <Button
          className="min-h-11 w-full justify-start text-destructive hover:text-destructive"
          disabled={editor.isSaving}
          onClick={() => {
            editor.removeOption(property.key, option.value);
            onGo({ level: 'PROPERTY', propertyKey: property.key });
          }}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {t('removeOption', { option: option.value })}
        </Button>
      </div>
    </div>
  );
};
