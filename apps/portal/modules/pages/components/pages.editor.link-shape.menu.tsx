'use client';

import { useTranslations } from 'next-intl';
import { PAGE_EDITOR_LINK_SHAPES } from '../constants/pages.editor.link-shape.constants';
import type { PageEditorLinkShape } from '../types/pages.editor.link-shape.types';

interface IProps {
  readonly onChoose: (shape: PageEditorLinkShape) => void;
}

/**
 * What to do with the link that was just pasted.
 *
 * It appears beside the link and offers the three shapes a link can take on a
 * page; doing nothing leaves it as it is, which is why the link is written
 * first and the choice only ever changes it.
 */
export const PagesEditorLinkShapeMenu = ({ onChoose }: IProps) => {
  const t = useTranslations('pages');

  return (
    <div
      aria-label={t('linkShapeLabel')}
      className="flex items-center gap-1 border border-border bg-surface-container p-1 shadow-lg"
      data-link-shape-menu="true"
      role="toolbar"
    >
      {PAGE_EDITOR_LINK_SHAPES.map((shape) => (
        <button
          className="min-h-11 px-3 text-foreground text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={shape}
          onClick={() => onChoose(shape)}
          type="button"
        >
          {t(`linkShape.${shape}`)}
        </button>
      ))}
    </div>
  );
};
