import { SPACE_IN_ADDRESS } from '../constants/portal.keyboard.constants';

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || target.matches('input, textarea, select');
};

export const isPortalCommandShortcut = (event: KeyboardEvent): boolean =>
  !isEditableElement(event.target) && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

export const isSidebarToggleShortcut = (event: KeyboardEvent): boolean =>
  !isEditableElement(event.target) && (event.metaKey || event.ctrlKey) && event.key === '.';

/**
 * The chord that starts a page without reaching for anything.
 *
 * Shift is part of it because the browser already keeps the plain chord for
 * opening a window of its own, and a shortcut that fights the browser is a
 * shortcut nobody can trust.
 */
export const isStartPageShortcut = (event: KeyboardEvent): boolean =>
  !isEditableElement(event.target) &&
  (event.metaKey || event.ctrlKey) &&
  event.shiftKey &&
  event.key.toLowerCase() === 'n';

/** Where a page started from the keyboard belongs: where the reader already is, or the first place they have. */
export const resolveSpaceToStartPageIn = (
  pathname: string,
  spaces: readonly { readonly id: string }[],
): null | string => {
  const named = SPACE_IN_ADDRESS.exec(pathname)?.[1];
  if (named !== undefined && spaces.some((space) => space.id === named)) return named;
  return spaces[0]?.id ?? null;
};
