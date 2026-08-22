import { PluginKey } from 'prosemirror-state';
import {
  PAGE_EDITOR_BLOCK_DRAG_PLUGIN_KEY,
  PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY,
  PAGE_EDITOR_BLOCK_MENU_PLUGIN_KEY,
} from '../blocks/constants/pages.editor.blocks.constants';
import type { PageEditorBlockDragState } from '../blocks/types/pages.editor.block-drag.types';
import type { PageEditorBlockRequest } from '../blocks/types/pages.editor.block-request.types';

/**
 * The gutter handle and the block drag are two plugins that must read each
 * other's state — the handle freezes while a drag is running, the drag starts
 * from the handle. Their keys live here so neither plugin has to import the
 * other.
 */
export const pageEditorBlockHandleKey = new PluginKey<number | null>(PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY);

export const pageEditorBlockDragKey = new PluginKey<PageEditorBlockDragState>(PAGE_EDITOR_BLOCK_DRAG_PLUGIN_KEY);

/** Which block the actions menu is open for, so the grip and the keyboard can both ask for it. */
export const pageEditorBlockMenuKey = new PluginKey<PageEditorBlockRequest | null>(PAGE_EDITOR_BLOCK_MENU_PLUGIN_KEY);
