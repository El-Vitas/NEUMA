'use client';

import { useTranslations } from 'next-intl';
import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { PageLinkPreview } from '../../../types/pages.link-preview.types';
import { PAGE_LINK_PREVIEW_ROUTE } from '../../menus/constants/pages.editor.link-shape.constants';
import {
  createPageBookmarkFromLinkCommand,
  createPageEmbedFromLinkCommand,
} from '../../menus/lib/pages.editor.link-shape.lib';
import type {
  PageEditorLinkShape,
  PageEditorLinkTarget,
  PageEditorPastedLink,
} from '../../menus/types/pages.editor.link-shape.types';
import type { PageEditorSurfaceRect } from '../../menus/types/pages.editor.surface.types';
import { PAGE_EDITOR_PLAIN_TEXT_PASTE_KEY } from '../constants/pages.editor.paste.constants';
import { createPageLinkFromBlockCommand, readPageLinkTarget } from '../lib/pages.editor.link-target.lib';
import {
  decidePageEditorPaste,
  dispatchPageEditorLinkOverSelection,
  dispatchPageEditorMarkdownBlocks,
  dispatchPageEditorPlainTextPaste,
} from '../lib/pages.editor.paste.lib';

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
  const pasteAsPlainTextRef = useRef(false);
  /**
   * Kept in a ref, the way every other label the editor needs is, so that
   * `handlePastedLink` keeps its identity across renders — `t` is a new
   * function every time, and the editor is torn down and rebuilt whenever
   * the paste handler it was given changes.
   */
  const pasteTooMuchLabelRef = useRef(t('paste.tooMuch'));
  useEffect(() => {
    pasteTooMuchLabelRef.current = t('paste.tooMuch');
  }, [t]);

  /**
   * Asked for once, by the keys, and answered only by the very next paste —
   * a ClipboardEvent alone never says which shortcut asked for it, so any
   * other key pressed before that paste lowers it again: the shortcut was
   * for one paste, not for every one that follows it.
   */
  useEffect(() => {
    const rememberPlainTextWasAsked = (event: KeyboardEvent): void => {
      const editorDom = editorViewRef.current?.dom;
      if (editorDom === undefined || !(event.target instanceof Node) || !editorDom.contains(event.target)) return;
      pasteAsPlainTextRef.current =
        event.shiftKey &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === PAGE_EDITOR_PLAIN_TEXT_PASTE_KEY;
    };
    document.addEventListener('keydown', rememberPlainTextWasAsked);
    return () => document.removeEventListener('keydown', rememberPlainTextWasAsked);
  }, [editorViewRef]);

  /** Where a link pasted at the cursor lands, and the choice offered about what it should become. */
  const pasteLinkAtCursor = useCallback(
    (view: EditorView, url: string): void => {
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
    },
    [readSurfaceRect],
  );

  /**
   * What every paste into the page answers to, beyond the file it may carry.
   *
   * A decision is worked out first, without touching the page, and only then
   * carried out — so what a paste becomes can be read on its own, the same
   * way whether it came from this app, from a written document, or from a
   * stranger's page.
   */
  const handlePastedLink = useCallback(
    (view: EditorView, event: ClipboardEvent): boolean => {
      const wantedPlainText = pasteAsPlainTextRef.current;
      pasteAsPlainTextRef.current = false;

      const clipboardData = event.clipboardData;
      if (clipboardData === null || clipboardData === undefined) return false;

      const decision = decidePageEditorPaste(view.state.schema, {
        hasSelection: !view.state.selection.empty,
        html: clipboardData.getData('text/html'),
        plainText: clipboardData.getData('text/plain'),
        wantedPlainText,
      });

      switch (decision.kind) {
        case 'default':
        case 'own-slice':
          return false;
        case 'plain-text':
          event.preventDefault();
          dispatchPageEditorPlainTextPaste(view, decision.text);
          return true;
        case 'too-large':
          event.preventDefault();
          dispatchPageEditorPlainTextPaste(view, decision.text);
          toast.error(pasteTooMuchLabelRef.current);
          return true;
        case 'link-over-selection':
          event.preventDefault();
          dispatchPageEditorLinkOverSelection(view, decision.url);
          return true;
        case 'link-at-cursor':
          event.preventDefault();
          pasteLinkAtCursor(view, decision.url);
          return true;
        case 'markdown-blocks':
          event.preventDefault();
          dispatchPageEditorMarkdownBlocks(view, decision.nodes);
          return true;
        default:
          return false;
      }
    },
    [pasteLinkAtCursor],
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
