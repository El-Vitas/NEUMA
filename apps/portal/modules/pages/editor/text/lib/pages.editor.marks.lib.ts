import {
  PAGE_EDITOR_MARK_BOX,
  PAGE_EDITOR_MARK_STYLE_CLASS,
  PAGE_EDITOR_MARK_WEIGHT,
  PAGE_EDITOR_SVG_NAMESPACE,
} from '../../blocks/constants/pages.editor.blocks.constants';

export const createPageMark = (strokes: readonly string[]): SVGSVGElement => {
  const mark = document.createElementNS(PAGE_EDITOR_SVG_NAMESPACE, 'svg');
  mark.setAttribute('viewBox', PAGE_EDITOR_MARK_BOX);
  mark.setAttribute('fill', 'none');
  mark.setAttribute('stroke', 'currentColor');
  mark.setAttribute('stroke-width', PAGE_EDITOR_MARK_WEIGHT);
  mark.setAttribute('stroke-linecap', 'round');
  mark.setAttribute('stroke-linejoin', 'round');
  mark.setAttribute('aria-hidden', 'true');
  mark.setAttribute('class', PAGE_EDITOR_MARK_STYLE_CLASS);
  for (const stroke of strokes) {
    const line = document.createElementNS(PAGE_EDITOR_SVG_NAMESPACE, 'path');
    line.setAttribute('d', stroke);
    mark.append(line);
  }
  return mark;
};

/** The label is both the accessible name and the tooltip, since an icon alone does not explain itself. */
export const showPageButtonAs = (button: HTMLButtonElement, label: string, strokes: readonly string[]): void => {
  button.setAttribute('aria-label', label);
  button.title = label;
  button.replaceChildren(createPageMark(strokes));
};

export const createPageMarkButton = (
  label: string,
  strokes: readonly string[],
  className: string,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  showPageButtonAs(button, label, strokes);
  return button;
};
