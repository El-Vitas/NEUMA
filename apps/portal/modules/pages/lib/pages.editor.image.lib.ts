import type { Command } from 'prosemirror-state';
import { PAGE_EDITOR_FILE_INPUT_SELECTOR } from '../constants/pages.editor.blocks.constants';

/**
 * Asks for the image to put on the page.
 *
 * A picture cannot be written, so the menu opens the same chooser the clip
 * opens rather than pretending to insert something: what lands on the page is
 * whatever comes back from it.
 */
export const askForPageImage: Command = (_state, _dispatch, view) => {
  const input = view?.dom.ownerDocument.querySelector<HTMLInputElement>(PAGE_EDITOR_FILE_INPUT_SELECTOR);
  if (input === null || input === undefined) return false;
  input.click();
  return true;
};
