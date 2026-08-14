import {
  DIAGRAM_FETCHING_ATTRIBUTES,
  DIAGRAM_FETCHING_ELEMENTS,
  DIAGRAM_FETCHING_TAG,
  DIAGRAM_HARDCODED_GREY,
  DIAGRAM_OUTSIDE_URL,
} from '@/shared/constants/diagram.constants';

/**
 * Lifts writing the engine painted in a grey of its own to the colour of the page.
 *
 * One family writes what a line means in a grey it carries in its own code,
 * chosen for a white page and reachable by no setting: on a page read at night
 * it is writing nobody can see, and it is the only word explaining the arrow.
 */
export const mendTheDrawing = (svg: string): string =>
  svg.replaceAll(`fill="${DIAGRAM_HARDCODED_GREY}"`, 'fill="currentColor"');

/** What a drawing may point at without leaving the page: its own pieces, and what it carries inside it. */
const staysInside = (address: string): boolean => {
  const said = address.trim().toLowerCase();
  return said.startsWith('#') || said.startsWith('data:');
};

const forgetWhatIsAskedOfOthers = (painted: string): string => painted.replace(DIAGRAM_OUTSIDE_URL, 'none');

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

/**
 * Takes the addresses out of what is about to be drawn.
 *
 * The drawing is measured by putting it on the page for an instant before it is
 * handed back, and an address in it is asked for during that instant — so
 * cleaning the finished drawing is too late, and the writing is cleaned first.
 */
export const keepTheDiagramSourceToItself = (source: string): string =>
  source.replace(DIAGRAM_OUTSIDE_URL, 'none').replace(DIAGRAM_FETCHING_TAG, '');

/**
 * Keeps a drawing to itself.
 *
 * A diagram is written by whoever can write on the page and looked at by
 * everyone who reads it. An address inside a drawing is a question asked of
 * somebody else's server, asked once for every reader, and the answer to it is
 * that the stranger learns who is reading and from where — so a drawing may
 * point at its own pieces and at what it carries inside it, and at nothing
 * else, whatever the writing asked for.
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

  return drawing.body.innerHTML;
};
