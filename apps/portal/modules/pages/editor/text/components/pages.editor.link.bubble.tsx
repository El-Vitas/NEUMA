'use client';

import { isPageLinkTarget } from '@neuma/shared';
import { ExternalLink, Pencil, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  PAGE_EDITOR_LINK_BUBBLE_ACTION_STYLE_CLASS,
  PAGE_EDITOR_LINK_BUBBLE_STYLE_CLASS,
  PAGE_EDITOR_LINK_BUBBLE_TARGET_STYLE_CLASS,
} from '../constants/pages.editor.link.constants';

interface IProps {
  readonly href: string;
  readonly onEdit: () => void;
  readonly onLeave: () => void;
  readonly onRemove: () => void;
}

export const PagesEditorLinkBubble = ({ href, onEdit, onLeave, onRemove }: IProps) => {
  const t = useTranslations('pages');

  return (
    <div
      aria-label={t('linkTools')}
      className={PAGE_EDITOR_LINK_BUBBLE_STYLE_CLASS}
      onMouseLeave={onLeave}
      role="toolbar"
    >
      <a
        className={PAGE_EDITOR_LINK_BUBBLE_TARGET_STYLE_CLASS}
        href={isPageLinkTarget(href) ? href : undefined}
        rel="noreferrer"
        target="_blank"
        title={href}
      >
        <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{href}</span>
      </a>
      <button
        aria-label={t('linkEdit')}
        className={PAGE_EDITOR_LINK_BUBBLE_ACTION_STYLE_CLASS}
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" className="size-4" />
      </button>
      <button
        aria-label={t('linkRemove')}
        className={PAGE_EDITOR_LINK_BUBBLE_ACTION_STYLE_CLASS}
        onClick={onRemove}
        type="button"
      >
        <Unlink aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
};
