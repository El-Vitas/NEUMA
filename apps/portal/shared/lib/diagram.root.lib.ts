import { DIAGRAM_ROOT_BOOKKEEPING_PREFIX } from '@/shared/constants/diagram.constants';

/**
 * Leaves what the interface hangs on the root of the page out of anything that walks it.
 *
 * The drawing engine writes one of its own notes by turning a whole diagram
 * into text, and a diagram holds on to the root of the page it is drawn in.
 * The interface hangs its bookkeeping there, and that bookkeeping points back
 * at itself, so turning it into text never ends and the drawing dies of it —
 * which is why diagrams of blocks draw everywhere except inside a page like
 * ours. Hiding those names from whoever is only walking the page leaves them
 * exactly as readable to whoever hung them.
 */
export const hideWhatIsHungOnTheRoot = (): void => {
  const root = document.documentElement;
  for (const name of Object.keys(root)) {
    if (!name.startsWith(DIAGRAM_ROOT_BOOKKEEPING_PREFIX)) continue;
    Object.defineProperty(root, name, { enumerable: false });
  }
};
