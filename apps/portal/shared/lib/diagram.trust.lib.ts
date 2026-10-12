import DOMPurify from 'dompurify';
import {
  DIAGRAM_FETCHING_ATTRIBUTES,
  DIAGRAM_FETCHING_ELEMENTS,
  DIAGRAM_FETCHING_TAG,
  DIAGRAM_HARDCODED_GREY,
  DIAGRAM_OUTSIDE_URL,
  DIAGRAM_SANITIZE_OPTIONS,
  DIAGRAM_SHEET_IMPORT,
} from '@/shared/constants/diagram.constants';

/** One family hardcodes a grey for a white page that no setting reaches; it is unreadable at night. */
export const mendTheDrawing = (svg: string): string =>
  svg.replaceAll(`fill="${DIAGRAM_HARDCODED_GREY}"`, 'fill="currentColor"');

const staysInside = (address: string): boolean => {
  const said = address.trim().toLowerCase();
  return said.startsWith('#') || said.startsWith('data:');
};

export const forgetWhatIsAskedOfOthers = (painted: string): string =>
  painted.replace(DIAGRAM_SHEET_IMPORT, '').replace(DIAGRAM_OUTSIDE_URL, 'none');

const dropAddressesOutside = (piece: Element): void => {
  for (const asked of DIAGRAM_FETCHING_ATTRIBUTES) {
    const address = piece.getAttribute(asked);
    if (address === null || staysInside(address)) continue;
    piece.removeAttribute(asked);
  }
};

const holdsAnAddressOutside = (piece: Element): boolean =>
  DIAGRAM_FETCHING_ATTRIBUTES.some((asked) => {
    const address = piece.getAttribute(asked);
    return address !== null && !staysInside(address);
  });

/** The drawing is measured while attached to the page, which fetches any address in it; clean the source first. */
export const keepTheDiagramSourceToItself = (source: string): string =>
  forgetWhatIsAskedOfOthers(source).replace(DIAGRAM_FETCHING_TAG, '');

/**
 * An external address in a drawing would make every reader's browser contact a third party. The sanitiser is a
 * second line behind the engine's own cleaning.
 */
export const keepTheDrawingToItself = (svg: string): string => {
  const drawing = new DOMParser().parseFromString(svg, 'text/html');

  for (const piece of drawing.querySelectorAll(DIAGRAM_FETCHING_ELEMENTS)) {
    if (holdsAnAddressOutside(piece)) piece.remove();
  }
  for (const piece of drawing.querySelectorAll('[style]')) {
    piece.setAttribute('style', forgetWhatIsAskedOfOthers(piece.getAttribute('style') ?? ''));
  }
  for (const piece of drawing.querySelectorAll('style')) {
    piece.textContent = forgetWhatIsAskedOfOthers(piece.textContent ?? '');
  }
  for (const piece of drawing.querySelectorAll('*')) {
    dropAddressesOutside(piece);
  }

  return DOMPurify.sanitize(drawing.body.innerHTML, DIAGRAM_SANITIZE_OPTIONS);
};
