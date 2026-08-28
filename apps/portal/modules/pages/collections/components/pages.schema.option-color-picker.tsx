'use client';

import type { PageOptionColor } from '@company-brain/shared';
import { PAGE_OPTION_COLOR_VALUES } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';

interface IProps {
  readonly color: PageOptionColor | null;
  readonly disabled: boolean;
  readonly onChange: (color: PageOptionColor) => void;
  readonly optionValue: string;
}

/**
 * The colors one option may wear, all of them in view.
 *
 * Shown as a row of buttons rather than a list to open, because picking a color
 * is a glance and a click, and a reader comparing two of them should not have to
 * open the list twice. Each one says its name out loud for whoever cannot tell
 * them apart by sight.
 */
export const PagesSchemaOptionColorPicker = ({ color, disabled, onChange, optionValue }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <fieldset
      aria-label={t('optionColorFor', { option: optionValue })}
      className="m-0 flex flex-wrap gap-1 border-0 p-0"
    >
      {PAGE_OPTION_COLOR_VALUES.map((candidate) => (
        <button
          aria-label={t(`colors.${candidate}`)}
          aria-pressed={candidate === color}
          className={cn(
            'size-6 rounded-sm border border-border/60',
            readPageOptionColorClass(candidate),
            FOCUS_RING_CLASS,
            candidate === color && 'ring-2 ring-foreground ring-offset-1',
          )}
          disabled={disabled}
          key={candidate}
          onClick={() => onChange(candidate)}
          title={t(`colors.${candidate}`)}
          type="button"
        />
      ))}
    </fieldset>
  );
};
