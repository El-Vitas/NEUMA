import { PluginKey } from 'prosemirror-state';
import {
  PAGE_EDITOR_BLOCK_DRAG_PLUGIN_KEY,
  PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY,
  PAGE_EDITOR_BLOCK_MENU_PLUGIN_KEY,
} from '../blocks/constants/pages.editor.blocks.constants';
import type { PageEditorBlockDragState } from '../blocks/types/pages.editor.block-drag.types';
import type { PageEditorBlockRequest } from '../blocks/types/pages.editor.block-request.types';

/** Shared keys: the handle and drag plugins read each other's state, so neither can import the other. */
export const pageEditorBlockHandleKey = new PluginKey<number | null>(PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY);

export const pageEditorBlockDragKey = new PluginKey<PageEditorBlockDragState>(PAGE_EDITOR_BLOCK_DRAG_PLUGIN_KEY);

export const pageEditorBlockMenuKey = new PluginKey<PageEditorBlockRequest | null>(PAGE_EDITOR_BLOCK_MENU_PLUGIN_KEY);
