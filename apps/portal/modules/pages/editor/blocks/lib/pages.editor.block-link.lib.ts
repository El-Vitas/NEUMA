import type { EditorState } from 'prosemirror-state';
import type { PageEditorBlockWatch } from '../../menus/types/pages.editor.surface.types';
import {
  PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES,
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
} from '../constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

export const readPageEditorBlockId = (state: EditorState): string | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const blockId: unknown = range.parent.child(range.startIndex).attrs.id;
  return typeof blockId === 'string' && blockId.length > 0 ? blockId : null;
};

export const buildPageEditorBlockLink = (pageUrl: string, blockId: string): string => {
  const [address] = pageUrl.split('#');
  return `${address ?? pageUrl}#${blockId}`;
};

export const readPageEditorBlockLinkTarget = (pageUrl: string): string | null => {
  const anchor = pageUrl.split('#')[1];
  return anchor === undefined || anchor.length === 0 ? null : decodeURIComponent(anchor);
};

export const findPageEditorBlockElement = (root: ParentNode, blockId: string): Element | null =>
  root.querySelector(`[${PAGE_EDITOR_BLOCK_ID_ATTRIBUTE}="${CSS.escape(blockId)}"]`);

/** Watches because a link opens before the page has drawn itself. Returns a function that stops watching. */
export const watchForPageEditorBlock = (options: PageEditorBlockWatch): (() => void) => {
  const found = findPageEditorBlockElement(options.root, options.blockId);
  if (found !== null) {
    options.onFound(found);
    return () => undefined;
  }

  const observer = new MutationObserver(() => {
    const block = findPageEditorBlockElement(options.root, options.blockId);
    if (block === null) return;
    stopWatching();
    options.onFound(block);
  });
  const giveUp = setTimeout(() => {
    stopWatching();
    options.onMissing();
  }, options.waitMs);
  const stopWatching = (): void => {
    observer.disconnect();
    clearTimeout(giveUp);
  };

  observer.observe(options.root, { childList: true, subtree: true });
  return stopWatching;
};

/** Returns a function that removes the mark. */
export const revealPageEditorBlock = (element: Element): (() => void) => {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  for (const className of PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES) element.classList.add(className);
  return () => {
    for (const className of PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES) element.classList.remove(className);
  };
};
