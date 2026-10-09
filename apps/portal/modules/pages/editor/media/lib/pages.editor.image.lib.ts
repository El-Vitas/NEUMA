import type { Command } from 'prosemirror-state';
import { PAGE_EDITOR_FILE_INPUT_SELECTOR } from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorAskCommand } from '../../lib/pages.editor.ask.lib';

/** Opens the same file chooser as the toolbar clip; the image is inserted when the upload returns. */
export const askForPageImage: Command = createPageEditorAskCommand(PAGE_EDITOR_FILE_INPUT_SELECTOR);
