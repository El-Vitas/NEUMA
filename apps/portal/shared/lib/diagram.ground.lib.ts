import { DARK_THEME_CLASS, THEME_ROOT_ATTRIBUTE } from '@/shared/constants/theme.constants';

/** Only a light/dark change counts: the theme root has other classes, and redrawing for each would be wasted. */
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
