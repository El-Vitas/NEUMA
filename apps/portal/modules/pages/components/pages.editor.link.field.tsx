'use client';

import { isPageLinkTarget } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_LINK_CANDIDATE_STYLE_CLASS,
  PAGE_EDITOR_LINK_FAULT_STYLE_CLASS,
  PAGE_EDITOR_LINK_FIELD_STYLE_CLASS,
  PAGE_EDITOR_LINK_INPUT_STYLE_CLASS,
} from '../constants/pages.editor.link.constants';
import { usePagesMentionSearch } from '../hooks/use.pages.mention-search';

interface IProps {
  readonly href: string | null;
  readonly onCancel: () => void;
  readonly onChoose: (href: string | null) => void;
}

/**
 * Where a link goes, asked for in one field.
 *
 * The same field takes an address and the name of a page, because from where
 * somebody is standing both answer the same question — where should this take
 * me — and having to say which of the two it is beforehand is a question about
 * the machine rather than about the writing. What is not somewhere to go is
 * refused with a reason instead of being written down as a broken link.
 */
export const PagesEditorLinkField = ({ href, onCancel, onChoose }: IProps) => {
  const t = useTranslations('pages');
  const [written, setWritten] = useState(href ?? '');
  const fieldRef = useRef<HTMLInputElement>(null);
  const [refused, setRefused] = useState(false);
  const looking = written.trim().length > 0 && !isPageLinkTarget(written);

  /** The field is asked for, so it takes the writing: leaving the cursor behind would ask and then not listen. */
  useEffect(() => fieldRef.current?.focus(), []);
  const search = usePagesMentionSearch(looking ? written.trim() : null);

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
