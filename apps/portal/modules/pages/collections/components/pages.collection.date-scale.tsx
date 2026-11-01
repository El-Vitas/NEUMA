'use client';

import type { PageDateScale } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface IProps {
  readonly disabled: boolean;
  readonly label: string;
  readonly onChange: (scale: PageDateScale) => void;
  /** The scales this view can draw: a calendar takes two of them, a timeline all three. */
  readonly scales: readonly PageDateScale[];
  readonly value: PageDateScale;
}

/** How much time one screen holds. It is the view's, so changing it changes it for everyone who looks. */
export const PagesCollectionDateScale = ({ disabled, label, onChange, scales, value }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <fieldset className="m-0 flex items-center rounded-md border-0 bg-muted p-0.5">
      <legend className="sr-only">{label}</legend>
      {scales.map((scale) => (
        <button
          aria-pressed={scale === value}
          className={cn(
            'min-h-8 rounded-sm px-2 text-muted-foreground text-xs hover:text-foreground disabled:opacity-60',
            scale === value && 'bg-background text-foreground shadow-xs',
          )}
          data-testid={`date-scale-${scale.toLowerCase()}`}
          disabled={disabled}
          key={scale}
          onClick={() => onChange(scale)}
          type="button"
        >
          {t(`dateScales.${scale}`)}
        </button>
      ))}
    </fieldset>
  );
};
