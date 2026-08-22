'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PageIconGlyph } from '@/shared/components/portal/page-icon-glyph';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_PREVIEW_CARD_STYLE_CLASS,
  PAGE_PREVIEW_FRAGMENT_STYLE_CLASS,
  PAGE_PREVIEW_GAP_PX,
  PAGE_PREVIEW_PROPERTY_LABEL_STYLE_CLASS,
  PAGE_PREVIEW_PROPERTY_ROW_STYLE_CLASS,
  PAGE_PREVIEW_PROPERTY_VALUE_STYLE_CLASS,
  PAGE_PREVIEW_STATE_STYLE_CLASS,
  PAGE_PREVIEW_TITLE_STYLE_CLASS,
} from '../constants/pages.preview.constants';
import type { PagePreviewOutcome, PagePreviewTarget } from '../types/pages.preview.types';

interface IProps {
  readonly onHold: () => void;
  readonly onLetGo: () => void;
  /** `null` while the page is still being asked for, since nothing is known about it yet. */
  readonly outcome: PagePreviewOutcome | null;
  readonly target: PagePreviewTarget;
}

/**
 * What a page says about itself, read while nothing more than a rest on its
 * name was asked for.
 *
 * One card answers every question a rest can ask: still being read, closed
 * to whoever is reading, or open and telling what it holds — a reader waiting
 * on it sees the same shape settle into an answer rather than a blank turning
 * into a card out of nowhere.
 *
 * The name it shows is also the way in, so a reader who found what they were
 * looking for in the card does not have to go back to the word that opened it.
 * That way in is what makes this a card and not a tooltip, which may hold
 * nothing anybody can reach.
 */
export const PagesPreviewCard = ({ onHold, onLetGo, outcome, target }: IProps) => {
  const t = useTranslations('pages');

  return (
    <div
      aria-label={t('preview.label')}
      data-page-preview-card="true"
      onMouseEnter={onHold}
      onMouseLeave={onLetGo}
      role="dialog"
      /** The space the link's own tools stand in belongs to the card, so reaching down for it is never leaving it. */
      style={{ paddingTop: `${PAGE_PREVIEW_GAP_PX}px` }}
    >
      <div className={PAGE_PREVIEW_CARD_STYLE_CLASS}>
        {outcome === null && <p className={PAGE_PREVIEW_STATE_STYLE_CLASS}>{t('preview.loading')}</p>}
        {outcome?.kind === 'denied' && <p className={PAGE_PREVIEW_STATE_STYLE_CLASS}>{t('preview.noAccess')}</p>}
        {outcome?.kind === 'found' && (
          <>
            <p className={PAGE_PREVIEW_TITLE_STYLE_CLASS}>
              {outcome.content.icon !== null && (
                <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-base leading-none">
                  <PageIconGlyph icon={outcome.content.icon} />
                </span>
              )}
              <Link
                className={`truncate underline-offset-4 hover:underline ${FOCUS_RING_CLASS}`}
                href={ROUTES.PORTAL_SPACE_PAGE(target.spaceId, target.pageId)}
              >
                {outcome.content.title.length === 0 ? t('untitled') : outcome.content.title}
              </Link>
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
    </div>
  );
};
