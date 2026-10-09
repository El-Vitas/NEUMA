'use client';

import { cn } from '@/lib/utils';
import { hasChoiceHint } from '../lib/access-tokens.lib';
import type { AccessTokenChoice } from '../types/access-tokens.types';

interface IProps<TValue extends string> {
  readonly legend: string;
  readonly name: string;
  readonly onChange: (value: TValue) => void;
  readonly options: readonly AccessTokenChoice<TValue>[];
  readonly value: TValue;
}

/** Native radios in a fieldset, so arrow keys move through the group and screen readers announce the question. */
export const AccessTokensChoiceGroup = <TValue extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: IProps<TValue>) => (
  <fieldset className="min-w-0 space-y-2 border-0 p-0">
    <legend className="mb-2 font-medium text-foreground text-sm">{legend}</legend>
    <div className={options.some(hasChoiceHint) ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-2'}>
      {options.map((option) => (
        <label
          className={cn(
            'flex min-h-11 gap-3 border border-border bg-surface px-3 py-2 has-checked:border-primary has-focus-visible:ring-2 has-focus-visible:ring-ring',
            hasChoiceHint(option) ? 'items-start' : 'items-center',
            option.isDisabled === true ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
          key={option.value}
        >
          <input
            checked={option.value === value}
            className="mt-0.5 size-4 shrink-0 accent-primary"
            disabled={option.isDisabled}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span className="min-w-0">
            <span className="block text-foreground text-sm">{option.label}</span>
            {hasChoiceHint(option) && <span className="block text-muted-foreground text-xs">{option.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);
