import { createPageEditorCommands } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';

export const PAGE_EDITOR_COMMANDS = createPageEditorCommands(pageEditorSchema);
