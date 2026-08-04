import { createPageEditorCommands } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';

export const DEFAULT_PAGE_TOGGLE_SUMMARY = 'Toggle';

export const PAGE_EDITOR_COMMANDS = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
