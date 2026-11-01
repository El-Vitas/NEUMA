'use client';

import { useTranslations } from 'next-intl';
import type { PageComputedError } from '../types/pages.schema.types';

interface IProps {
  readonly error: PageComputedError;
}

/** A formula or rollup that could not be computed says so in its cell, with the reason one hover away. */
export const PagesPropertiesComputedError = ({ error }: IProps) => {
  const t = useTranslations('pages');

  return (
    <span
      className="inline-flex items-center rounded-sm bg-destructive/10 px-1.5 text-destructive text-xs"
      data-testid="computed-error"
      title={`${error.code}: ${error.message}`}
    >
      {t('properties.computedError')}
    </span>
  );
};
