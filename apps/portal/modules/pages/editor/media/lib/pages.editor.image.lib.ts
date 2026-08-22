import type { Command } from 'prosemirror-state';
import { PAGE_EDITOR_FILE_INPUT_SELECTOR } from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorAskCommand } from '../../lib/pages.editor.ask.lib';

/**
 * Asks for the image to put on the page.
 *
 * A picture cannot be written, so the menu opens the same chooser the clip
 * opens rather than pretending to insert something: what lands on the page is
 * whatever comes back from it.
 */
export const askForPageImage: Command = createPageEditorAskCommand(PAGE_EDITOR_FILE_INPUT_SELECTOR);
