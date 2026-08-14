'use client';

import { useTranslations } from 'next-intl';
import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { PAGE_LINK_PREVIEW_ROUTE } from '../constants/pages.editor.link-shape.constants';
import {
  createPageBookmarkFromLinkCommand,
  createPageEmbedFromLinkCommand,
  readPastedLinkUrl,
} from '../lib/pages.editor.link-shape.lib';
import { createPageLinkFromBlockCommand, readPageLinkTarget } from '../lib/pages.editor.link-target.lib';
import type {
  PageEditorLinkShape,
  PageEditorLinkTarget,
  PageEditorPastedLink,
} from '../types/pages.editor.link-shape.types';
import type { PageEditorSurfaceRect } from '../types/pages.editor.surface.types';
import type { PageLinkPreview } from '../types/pages.link-preview.types';

const askWhatTheLinkSays = async (url: string): Promise<PageLinkPreview | null> => {
  try {
    const answer = await fetch(`${PAGE_LINK_PREVIEW_ROUTE}?url=${encodeURIComponent(url)}`);
    if (!answer.ok) return null;
    const said = (await answer.json()) as PageLinkPreview;
    return said.title === undefined && said.icon === undefined ? null : said;
  } catch {
    return null;
  }
};

/**
 * What happens to a link the moment it is pasted.
 *
 * It is written as a link first and the choice only ever changes it, so doing
 * nothing — carrying on writing — leaves exactly what was pasted. What the link
 * says about itself is asked for only if a card is chosen: a page should not go
 * knocking on other people's servers for every address anyone pastes.
 */
export const usePagesEditorPastedLink = (
  editorViewRef: RefObject<EditorView | null>,
  readSurfaceRect: () => PageEditorSurfaceRect | null,
): {
  readonly choose: (shape: PageEditorLinkShape) => void;
  readonly forget: () => void;
  readonly handlePastedLink: (view: EditorView, event: ClipboardEvent) => boolean;
  readonly pasted: PageEditorPastedLink | null;
  readonly shapeLink: (target: PageEditorLinkTarget, shape: PageEditorLinkShape) => void;
} => {
  const t = useTranslations('pages');
  const [pasted, setPasted] = useState<PageEditorPastedLink | null>(null);
  const forget = useCallback(() => setPasted(null), []);

  const handlePastedLink = useCallback(
    (view: EditorView, event: ClipboardEvent): boolean => {
      const url = readPastedLinkUrl(event.clipboardData?.getData('text/plain') ?? '');
      if (url === null || !view.state.selection.empty) return false;
      event.preventDefault();

      const { from } = view.state.selection;
      const written = view.state.schema.text(url, [view.state.schema.marks.link.create({ href: url })]);
      view.dispatch(view.state.tr.replaceSelectionWith(written, false).scrollIntoView());

      const surfaceRect = readSurfaceRect();
      const coords = view.coordsAtPos(from);
      setPasted({
        from,
        left: surfaceRect === null ? coords.left : coords.left - surfaceRect.left,
        to: from + url.length,
        top: surfaceRect === null ? coords.bottom : coords.bottom - surfaceRect.top,
        url,
      });
      return true;
    },
    [readSurfaceRect],
  );

  /**
   * Gives a link the shape it was asked for, wherever it already is on the page.
   *
   * The same three shapes are offered the moment a link is pasted and long
   * after, from the block's own menu: which one it wears is not a decision that
   * has to be made in the second it arrives.
   */
  const shapeLink = useCallback(
    (asked: PageEditorLinkTarget, shape: PageEditorLinkShape) => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;

      /**
       * Where the link stands is asked of the page itself at the moment of
       * choosing, not remembered from when the menu was opened: by then the
       * writing may have moved, and a remembered place is how a choice lands
       * somewhere else — or, worse, silently nowhere.
       */
      const target = readPageLinkTarget(editorView.state) ?? asked;
      if (shape === target.chosen) return;

      if (shape === 'link') {
        createPageLinkFromBlockCommand(target)(editorView.state, editorView.dispatch);
        return;
      }

      if (shape === 'embed') {
        const ran = createPageEmbedFromLinkCommand(
          editorView.state.schema,
          target,
          target.url,
        )(editorView.state, editorView.dispatch);
        if (!ran) toast.error(t('linkNotEmbeddable'));
        return;
      }

      /**
       * Asking a stranger what it is called takes as long as it takes, so the
       * page says it is asking. The editor is asked for again once the answer
       * is back: by then the one held here may have been taken down and built
       * again.
       */
      const waiting = toast.loading(t('linkBeingRead'));
      void askWhatTheLinkSays(target.url).then((said) => {
        const editorNow = editorViewRef.current;
        const made =
          said !== null &&
          editorNow !== null &&
          createPageBookmarkFromLinkCommand(editorNow.state.schema, target, said)(editorNow.state, editorNow.dispatch);
        if (made) toast.dismiss(waiting);
        else toast.error(t('linkNotPreviewable'), { id: waiting });
      });
    },
    [editorViewRef, t],
  );

  const choose = useCallback(
    (shape: PageEditorLinkShape) => {
      if (pasted === null) return;
      setPasted(null);
      shapeLink({ ...pasted, chosen: 'link' }, shape);
    },
    [pasted, shapeLink],
  );

  return { choose, forget, handlePastedLink, pasted, shapeLink };
};
