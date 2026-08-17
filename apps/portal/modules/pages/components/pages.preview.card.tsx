'use client';

import { useTranslations } from 'next-intl';
import {
  PAGE_PREVIEW_CARD_STYLE_CLASS,
  PAGE_PREVIEW_FRAGMENT_STYLE_CLASS,
  PAGE_PREVIEW_PROPERTY_LABEL_STYLE_CLASS,
  PAGE_PREVIEW_PROPERTY_ROW_STYLE_CLASS,
  PAGE_PREVIEW_PROPERTY_VALUE_STYLE_CLASS,
  PAGE_PREVIEW_STATE_STYLE_CLASS,
  PAGE_PREVIEW_TITLE_STYLE_CLASS,
} from '../constants/pages.preview.constants';
import type { PagePreviewOutcome } from '../types/pages.preview.types';

interface IProps {
  /** `null` while the page is still being asked for, since nothing is known about it yet. */
  readonly outcome: PagePreviewOutcome | null;
}

/**
 * What a page says about itself, read while nothing more than a rest on its
 * name was asked for.
 *
 * One card answers every question a rest can ask: still being read, closed
 * to whoever is reading, or open and telling what it holds — a reader waiting
 * on it sees the same shape settle into an answer rather than a blank turning
 * into a card out of nowhere.
 */
export const PagesPreviewCard = ({ outcome }: IProps) => {
  const t = useTranslations('pages');

  return (
    <div
      aria-label={t('preview.label')}
      className={PAGE_PREVIEW_CARD_STYLE_CLASS}
      data-page-preview-card="true"
      role="tooltip"
    >
      {outcome === null && <p className={PAGE_PREVIEW_STATE_STYLE_CLASS}>{t('preview.loading')}</p>}
      {outcome?.kind === 'denied' && <p className={PAGE_PREVIEW_STATE_STYLE_CLASS}>{t('preview.noAccess')}</p>}
      {outcome?.kind === 'found' && (
        <>
          <p className={PAGE_PREVIEW_TITLE_STYLE_CLASS}>
            {outcome.content.icon !== null && <span aria-hidden="true">{outcome.content.icon}</span>}
            <span className="truncate">
              {outcome.content.title.length === 0 ? t('untitled') : outcome.content.title}
            </span>
          </p>
          {outcome.content.properties.length > 0 && (
            <dl className="flex flex-col gap-1">
              {outcome.content.properties.map((property) => (
                <div className={PAGE_PREVIEW_PROPERTY_ROW_STYLE_CLASS} key={property.key}>
                  <dt className={PAGE_PREVIEW_PROPERTY_LABEL_STYLE_CLASS}>{property.label}</dt>
                  <dd className={PAGE_PREVIEW_PROPERTY_VALUE_STYLE_CLASS}>{property.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className={PAGE_PREVIEW_FRAGMENT_STYLE_CLASS}>
            {outcome.content.fragment.length === 0 ? t('preview.empty') : outcome.content.fragment}
          </p>
        </>
      )}
    </div>
  );
};
