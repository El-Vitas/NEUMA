'use client';

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useEffect, useRef } from 'react';
import {
  PAGE_EDITOR_FIND_ACTION_STYLE_CLASS,
  PAGE_EDITOR_FIND_COUNT_STYLE_CLASS,
  PAGE_EDITOR_FIND_INPUT_STYLE_CLASS,
  PAGE_EDITOR_FIND_PANEL_STYLE_CLASS,
  PAGE_EDITOR_FIND_REPLACE_ACTION_STYLE_CLASS,
  PAGE_EDITOR_FIND_REPLACE_ACTIONS_ROW_STYLE_CLASS,
  PAGE_EDITOR_FIND_ROW_STYLE_CLASS,
} from '../constants/pages.editor.find.constants';

interface IProps {
  readonly currentIndex: number | null;
  readonly onClose: () => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onQueryChange: (query: string) => void;
  readonly onReplace: () => void;
  readonly onReplaceAll: () => void;
  readonly onReplacementChange: (replacement: string) => void;
  readonly query: string;
  readonly replacement: string;
  readonly totalMatches: number;
}

export const PagesEditorFindPanel = ({
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onQueryChange,
  onReplace,
  onReplaceAll,
  onReplacementChange,
  query,
  replacement,
  totalMatches,
}: IProps) => {
  const t = useTranslations('pages');
  const fieldRef = useRef<HTMLInputElement>(null);
  const hasMatches = totalMatches > 0;

  useEffect(() => fieldRef.current?.focus(), []);

  const answerQueryKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (event.shiftKey) onPrevious();
    else onNext();
  };

  const answerReplaceKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onReplace();
  };

  return (
    <search aria-label={t('find.open')} className={PAGE_EDITOR_FIND_PANEL_STYLE_CLASS}>
      <div className={PAGE_EDITOR_FIND_ROW_STYLE_CLASS}>
        <input
          aria-label={t('find.field')}
          className={PAGE_EDITOR_FIND_INPUT_STYLE_CLASS}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={answerQueryKey}
          placeholder={t('find.field')}
          ref={fieldRef}
          value={query}
        />
        {query.length > 0 && (
          <span aria-live="polite" className={PAGE_EDITOR_FIND_COUNT_STYLE_CLASS}>
            {hasMatches
              ? t('find.matches', { current: (currentIndex ?? 0) + 1, total: totalMatches })
              : t('find.noMatches')}
          </span>
        )}
        <button
          aria-label={t('find.previous')}
          className={PAGE_EDITOR_FIND_ACTION_STYLE_CLASS}
          disabled={!hasMatches}
          onClick={onPrevious}
          type="button"
        >
          <ChevronUp aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label={t('find.next')}
          className={PAGE_EDITOR_FIND_ACTION_STYLE_CLASS}
          disabled={!hasMatches}
          onClick={onNext}
          type="button"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label={t('find.close')}
          className={PAGE_EDITOR_FIND_ACTION_STYLE_CLASS}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className={PAGE_EDITOR_FIND_ROW_STYLE_CLASS}>
        <input
          aria-label={t('find.replaceField')}
          className={PAGE_EDITOR_FIND_INPUT_STYLE_CLASS}
          onChange={(event) => onReplacementChange(event.target.value)}
          onKeyDown={answerReplaceKey}
          placeholder={t('find.replaceField')}
          value={replacement}
        />
      </div>
      <div className={PAGE_EDITOR_FIND_REPLACE_ACTIONS_ROW_STYLE_CLASS}>
        <button
          className={PAGE_EDITOR_FIND_REPLACE_ACTION_STYLE_CLASS}
          disabled={!hasMatches}
          onClick={onReplace}
          type="button"
        >
          {t('find.replace')}
        </button>
        <button
          className={PAGE_EDITOR_FIND_REPLACE_ACTION_STYLE_CLASS}
          disabled={!hasMatches}
          onClick={onReplaceAll}
          type="button"
        >
          {t('find.replaceAll')}
        </button>
      </div>
    </search>
  );
};
