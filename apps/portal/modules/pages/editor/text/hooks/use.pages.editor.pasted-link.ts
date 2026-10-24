'use client';

import { useTranslations } from 'next-intl';
import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { linkPreviewResponseSchema } from '../../../links/schemas/pages.link-preview.response.schemas';
import type { PageLinkPreview } from '../../../links/types/pages.link-preview.types';
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
    const parsed = linkPreviewResponseSchema.safeParse(await answer.json());
    if (!parsed.success) return null;
    const said: PageLinkPreview = parsed.data;
    return said.title === undefined && said.icon === undefined ? null : said;
  } catch {
    return null;
  }
};

/** The pasted URL is inserted as a plain link first; link metadata is fetched only if a card is chosen. */
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
  /** In a ref so `handlePastedLink` stays stable: a new handler rebuilds the editor. */
  const pasteTooMuchLabelRef = useRef(t('paste.tooMuch'));
  useEffect(() => {
    pasteTooMuchLabelRef.current = t('paste.tooMuch');
  }, [t]);

  /** A ClipboardEvent does not say which shortcut fired it, so the keydown is remembered for the next paste. */
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

  const shapeLink = useCallback(
    (asked: PageEditorLinkTarget, shape: PageEditorLinkShape) => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;

      // Re-read at choice time: the document may have moved since the menu opened.
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

      // The editor ref is read again after the await: the view may have been rebuilt meanwhile.
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
