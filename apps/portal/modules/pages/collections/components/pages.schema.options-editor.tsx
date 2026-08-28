'use client';

import type { PageOptionColor } from '@company-brain/shared';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import { PagesSchemaOptionColorPicker } from './pages.schema.option-color-picker';

interface IProps {
  readonly disabled: boolean;
  readonly onAdd: (value: string) => void;
  readonly onChangeColor: (value: string, color: PageOptionColor) => void;
  readonly onRemove: (value: string) => void;
  readonly property: PageSchemaProperty;
}

/**
 * The choices one property offers, each with the color it wears.
 *
 * Every option is listed with its color at hand, because choosing colors is
 * comparing them: a picker that opens one option at a time hides the very thing
 * being decided.
 */
export const PagesSchemaOptionsEditor = ({ disabled, onAdd, onChangeColor, onRemove, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const [newOption, setNewOption] = useState('');

  const addAndClear = () => {
    onAdd(newOption);
    setNewOption('');
  };

  return (
    <fieldset className="m-0 space-y-3 border-0 p-0">
      <legend className="text-muted-foreground text-xs uppercase tracking-wide">
        {t('optionsTitle', { property: property.label })}
      </legend>
      <ul className="space-y-2">
        {(property.options ?? []).map((option) => (
          <li className="flex flex-wrap items-center gap-2" key={option.value}>
            <span className={cn('min-w-24 rounded-sm px-2 py-0.5 text-sm', readPageOptionColorClass(option.color))}>
              {option.value}
            </span>
            <PagesSchemaOptionColorPicker
              color={option.color}
              disabled={disabled}
              onChange={(color) => onChangeColor(option.value, color)}
              optionValue={option.value}
            />
            <Button
              className={cn('min-h-11 min-w-11', FOCUS_RING_CLASS)}
              disabled={disabled}
              onClick={() => onRemove(option.value)}
              size="icon"
              title={t('removeOption', { option: option.value })}
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">{t('removeOption', { option: option.value })}</span>
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          aria-label={t('newOptionPlaceholder')}
          className="max-w-64"
          disabled={disabled}
          onChange={(event) => setNewOption(event.target.value)}
          placeholder={t('newOptionPlaceholder')}
          value={newOption}
        />
        <Button
          className={cn('min-h-11', FOCUS_RING_CLASS)}
          disabled={disabled || newOption.trim() === ''}
          onClick={addAndClear}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('addOption')}
        </Button>
      </div>
    </fieldset>
  );
};
