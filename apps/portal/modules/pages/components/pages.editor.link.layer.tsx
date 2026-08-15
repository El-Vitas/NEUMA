'use client';

import type { PageEditorLinkAtHand } from '../types/pages.editor.link.types';
import type { PageSummary } from '../types/pages.types';
import { PagesEditorLinkBubble } from './pages.editor.link.bubble';
import { PagesEditorLinkField } from './pages.editor.link.field';

interface IProps {
  readonly asked: PageEditorLinkAtHand | null;
  readonly onCancel: () => void;
  readonly onChoose: (href: string | null) => void;
  readonly onEdit: (rested: PageEditorLinkAtHand) => void;
  readonly onLeave: () => void;
  readonly onRemove: (rested: PageEditorLinkAtHand) => void;
  readonly pagesAtHand: readonly PageSummary[];
  readonly rested: PageEditorLinkAtHand | null;
}

/**
 * Everything the page says about one link: the bubble a link shows when the
 * pointer rests on it, and the field that asks where it goes.
 *
 * They are one thing because they never both belong on screen — being asked
 * where a link goes replaces resting on it.
 */
export const PagesEditorLinkLayer = ({
  asked,
  onCancel,
  onChoose,
  onEdit,
  onLeave,
  onRemove,
  pagesAtHand,
  rested,
}: IProps) => {
  if (asked !== null) {
    return (
      <div className="absolute z-40" style={{ left: `${asked.spot.left}px`, top: `${asked.spot.top}px` }}>
        <PagesEditorLinkField
          href={asked.link.href}
          onCancel={onCancel}
          onChoose={onChoose}
          pagesAtHand={pagesAtHand}
        />
      </div>
    );
  }

  if (rested === null) return null;

  return (
    <div className="absolute z-40" style={{ left: `${rested.spot.left}px`, top: `${rested.spot.top}px` }}>
      <PagesEditorLinkBubble
        href={rested.link.href ?? ''}
        onEdit={() => onEdit(rested)}
        onLeave={onLeave}
        onRemove={() => onRemove(rested)}
      />
    </div>
  );
};
