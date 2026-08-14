import { THEME_ROOT_ATTRIBUTE } from '@/shared/constants/theme.constants';

/**
 * Watches the ground a drawing is read on, and says when it changes.
 *
 * A diagram left in the colours of the night is unreadable by day and nobody
 * thinks to retype it to fix that, so whoever holds a drawing redraws it when
 * the page changes how it is being read. What comes back stops the watching.
 */
export const watchTheDiagramGround = (changed: () => void): (() => void) => {
  const ground = document.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`);
  const watching = new MutationObserver(() => changed());
  if (ground !== null) watching.observe(ground, { attributeFilter: ['class'] });
  return () => watching.disconnect();
};
