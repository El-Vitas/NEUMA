'use client';

import { isPageLinkTarget } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { usePagesMentionSearch } from '../../../hooks/use.pages.mention-search';
import type { PageReference } from '../../../types/pages.types';
import {
  PAGE_EDITOR_LINK_CANDIDATE_STYLE_CLASS,
  PAGE_EDITOR_LINK_FAULT_STYLE_CLASS,
  PAGE_EDITOR_LINK_FIELD_STYLE_CLASS,
  PAGE_EDITOR_LINK_INPUT_STYLE_CLASS,
} from '../constants/pages.editor.link.constants';

interface IProps {
  readonly href: string | null;
  readonly pagesAtHand: readonly PageReference[];
  readonly onCancel: () => void;
  readonly onChoose: (href: string | null) => void;
}

/** One field takes either a URL or a page name, so the user never has to pick which kind of target it is. */
export const PagesEditorLinkField = ({ href, onCancel, onChoose, pagesAtHand }: IProps) => {
  const t = useTranslations('pages');
  const [written, setWritten] = useState(href ?? '');
  const fieldRef = useRef<HTMLInputElement>(null);
  const [refused, setRefused] = useState(false);
  const looking = written.trim().length > 0 && !isPageLinkTarget(written);

  useEffect(() => fieldRef.current?.focus(), []);
  const search = usePagesMentionSearch(looking ? written.trim() : null, pagesAtHand);

  const apply = (): void => {
    if (isPageLinkTarget(written)) {
      onChoose(written.trim());
      return;
    }
    setRefused(true);
  };

  return (
    <div className={PAGE_EDITOR_LINK_FIELD_STYLE_CLASS} data-page-link-field="true">
      <input
        aria-label={t('linkField')}
        className={PAGE_EDITOR_LINK_INPUT_STYLE_CLASS}
        onChange={(event) => {
          setWritten(event.target.value);
          setRefused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
          if (event.key !== 'Enter') return;
          event.preventDefault();
          apply();
        }}
        placeholder={t('linkPlaceholder')}
        ref={fieldRef}
        value={written}
      />
      {refused && <p className={PAGE_EDITOR_LINK_FAULT_STYLE_CLASS}>{t('linkFault')}</p>}
      {looking &&
        search.candidates.map((candidate) => (
          <button
            className={PAGE_EDITOR_LINK_CANDIDATE_STYLE_CLASS}
            key={candidate.id}
            onClick={() => onChoose(ROUTES.PORTAL_SPACE_PAGE(candidate.spaceId, candidate.id))}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      {href !== null && (
        <button
          className={PAGE_EDITOR_LINK_CANDIDATE_STYLE_CLASS}
          onClick={() => onChoose(null)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          {t('linkRemove')}
        </button>
      )}
    </div>
  );
};
