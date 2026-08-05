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
