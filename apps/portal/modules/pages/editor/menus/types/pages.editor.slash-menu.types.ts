import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type { PageEditorCommandGroup, PageReference } from '../../../types/pages.types';
import type { PageEditorSpot } from './pages.editor.surface.types';

export type PagesEditorTriggerKind = 'emoji' | 'mention' | 'slash';

export interface PagesEditorTrigger {
  readonly kind: PagesEditorTriggerKind;
  readonly query: string;
}

export interface PagesEditorMenuItem {
  readonly group?: PageEditorCommandGroup;
  readonly id: string;
  readonly label: string;
  readonly run: Command;
}

export interface SlashMenuKeyDownOptions {
  readonly event: KeyboardEvent;
  readonly items: readonly PagesEditorMenuItem[];
  readonly onClose: () => void;
  readonly onSelect: (item: PagesEditorMenuItem) => void;
  readonly onSelectedIndexChange: (index: number) => void;
  readonly selectedIndex: number;
}

export interface PagesEditorTriggerMenuParameters {
  readonly canMakeAPage: boolean;
  readonly editorViewRef: RefObject<EditorView | null>;
  readonly onEscapeWithSelection: (editorView: EditorView) => void;
  readonly pagesAtHand: readonly PageReference[];
  readonly spaceId: string;
  readonly surfaceRef: RefObject<HTMLDivElement | null>;
}

export interface PagesEditorTriggerMenu {
  readonly answerKeyPress: (editorView: EditorView, event: KeyboardEvent) => boolean;
  readonly computeMenuPosition: (editorView: EditorView, fromPos: number, toPos: number) => PageEditorSpot | null;
  readonly selectTriggerCommand: (item: PagesEditorMenuItem) => void;
  readonly rememberTriggerMenuPosition: (position: PageEditorSpot | null) => void;
  readonly triggerAriaLabel: string;
  readonly triggerEmptyMessage: string;
  readonly triggerItems: readonly PagesEditorMenuItem[];
  readonly triggerMenuPosition: PageEditorSpot | null;
  readonly triggerQuery: string | null;
  readonly triggerSelectedIndex: number;
  readonly updateEditorTrigger: (text: string) => PagesEditorTrigger | null;
}
