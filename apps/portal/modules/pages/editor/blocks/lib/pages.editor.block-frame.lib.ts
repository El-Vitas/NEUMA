import { PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES } from '../constants/pages.editor.blocks.constants';

/** The side is also written on the element, because page styles read it from there. */
export const framePageBlockAlignment = (figure: HTMLElement, styleClass: string, align: unknown): void => {
  const named = typeof align === 'string' ? align : null;
  figure.className = `${styleClass} ${
    PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES[String(align)] ?? PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES.left
  }`;
  if (named === null) delete figure.dataset.align;
  else figure.dataset.align = named;
};
