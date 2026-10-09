import { DARK_THEME_CLASS, THEME_ROOT_ATTRIBUTE } from '@/shared/constants/theme.constants';

/**
 * Watches the ground a drawing is read on, and says when it changes.
 *
 * A diagram left in the colours of the night is unreadable by day and nobody
 * thinks to retype it to fix that, so whoever holds a drawing redraws it when
 * the page changes how it is being read. Only a change between day and night
 * counts: the theme root wears other classes too, and redrawing every diagram
 * of a page for each of them would draw them all again for nothing. What comes
 * back stops the watching.
 */
export const watchTheDiagramGround = (changed: () => void): (() => void) => {
  const ground = document.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`);
  if (ground === null) return () => undefined;
  let isDark = ground.classList.contains(DARK_THEME_CLASS);
  const watching = new MutationObserver(() => {
    const isDarkNow = ground.classList.contains(DARK_THEME_CLASS);
    if (isDarkNow === isDark) return;
    isDark = isDarkNow;
    changed();
  });
  watching.observe(ground, { attributeFilter: ['class'] });
  return () => watching.disconnect();
};
