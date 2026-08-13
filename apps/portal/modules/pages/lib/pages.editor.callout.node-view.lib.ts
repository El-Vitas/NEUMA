import { PAGE_CALLOUT_ICONS } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_CALLOUT_BODY_STYLE_CLASS,
  PAGE_EDITOR_CALLOUT_CLASS,
  PAGE_EDITOR_CALLOUT_ICON_GLYPHS,
  PAGE_EDITOR_CALLOUT_ICON_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';

/** How a kind of aside is drawn, or nothing at all when the page names a kind this version cannot draw. */
const readPageCalloutGlyph = (kind: unknown): string | null => {
  const known = PAGE_CALLOUT_ICONS.find((icon) => icon === kind);
  return known === undefined ? null : PAGE_EDITOR_CALLOUT_ICON_GLYPHS[known];
};

/**
 * Renders an aside with the mark it carries beside what it says.
 *
 * The mark is drawn from the block and never written into it here: it is chosen
 * from the block's own menu, where everything else about a block is decided, so
 * there is one place to look rather than two. It is spoken as part of the aside
 * rather than announced on its own, since it says what kind of aside this is
 * and nothing more.
 */
export const createPageCalloutNodeView = (node: EditorNode): NodeView => {
  const callout = document.createElement('aside');
  const mark = document.createElement('span');
  const body = document.createElement('div');

  const showMark = (kind: unknown): void => {
    const glyph = readPageCalloutGlyph(kind);
    mark.textContent = glyph ?? '';
    mark.toggleAttribute('hidden', glyph === null);
    if (typeof kind === 'string' && glyph !== null) callout.dataset.icon = kind;
    else callout.removeAttribute('data-icon');
  };

  callout.className = PAGE_EDITOR_CALLOUT_CLASS;
  callout.dataset.callout = 'true';
  mark.className = PAGE_EDITOR_CALLOUT_ICON_STYLE_CLASS;
  mark.contentEditable = 'false';
  mark.setAttribute('aria-hidden', 'true');
  body.className = PAGE_EDITOR_CALLOUT_BODY_STYLE_CLASS;
  callout.append(mark, body);
  showMark(node.attrs.icon);

  return {
    contentDOM: body,
    dom: callout,
    ignoreMutation: (mutation) => !body.contains(mutation.target),
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      showMark(updatedNode.attrs.icon);
      return true;
    },
  };
};
