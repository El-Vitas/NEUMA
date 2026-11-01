'use client';

import type { PageReference } from '../../../types/pages.types';
import type { PageEditorLinkAtHand } from '../types/pages.editor.link.types';
import { PagesEditorLinkBubble } from './pages.editor.link.bubble';
import { PagesEditorLinkField } from './pages.editor.link.field';

interface IProps {
  readonly asked: PageEditorLinkAtHand | null;
  readonly onCancel: () => void;
  readonly onChoose: (href: string | null) => void;
  readonly onEdit: (rested: PageEditorLinkAtHand) => void;
  readonly onLeave: () => void;
  readonly onRemove: (rested: PageEditorLinkAtHand) => void;
  readonly pagesAtHand: readonly PageReference[];
  readonly rested: PageEditorLinkAtHand | null;
}

/** The hover bubble and the edit field share one layer because they are never on screen together. */
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
