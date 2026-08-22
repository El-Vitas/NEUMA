import { PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES } from '../constants/pages.editor.blocks.constants';

/**
 * Puts a block where its own attributes say it should sit.
 *
 * Images, video, files and embeds are four different things that hang on the
 * page the same way, so where they sit is decided once. The side is written on
 * the element as well as into its class, because the page's own styles read it
 * from there and a block that lost the mark would silently drift left.
 */
export const framePageBlockAlignment = (figure: HTMLElement, styleClass: string, align: unknown): void => {
  const named = typeof align === 'string' ? align : null;
  figure.className = `${styleClass} ${
    PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES[String(align)] ?? PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES.left
  }`;
  if (named === null) delete figure.dataset.align;
  else figure.dataset.align = named;
};
