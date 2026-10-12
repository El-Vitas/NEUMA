import { DIAGRAM_ROOT_BOOKKEEPING_PREFIX } from '@/shared/constants/diagram.constants';

/**
 * The engine serialises the diagram, including the page root. React's bookkeeping on it is self-referencing, so
 * serialising never ends; hiding those keys from the walker leaves them readable to their owner.
 */
export const hideWhatIsHungOnTheRoot = (): void => {
  const root = document.documentElement;
  for (const name of Object.keys(root)) {
    if (!name.startsWith(DIAGRAM_ROOT_BOOKKEEPING_PREFIX)) continue;
    Object.defineProperty(root, name, { enumerable: false });
  }
};
