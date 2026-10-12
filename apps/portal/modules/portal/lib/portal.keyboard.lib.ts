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

/** Requires Shift because the plain chord opens a new browser window. */
export const isStartPageShortcut = (event: KeyboardEvent): boolean =>
  !isEditableElement(event.target) &&
  (event.metaKey || event.ctrlKey) &&
  event.shiftKey &&
  event.key.toLowerCase() === 'n';

/** Falls back to the first space when the address names none the reader can reach. */
export const resolveSpaceToStartPageIn = (
  pathname: string,
  spaces: readonly { readonly id: string }[],
): null | string => {
  const named = SPACE_IN_ADDRESS.exec(pathname)?.[1];
  if (named !== undefined && spaces.some((space) => space.id === named)) return named;
  return spaces[0]?.id ?? null;
};
