import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type { PageEditorCommandGroup, PageSummary } from '../../../types/pages.types';
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

/** What the menu beside the cursor needs: the editor it types into, the box it is placed against, and what to do when Escape leaves a selection behind instead of closing a menu. */
export interface PagesEditorTriggerMenuParameters {
  /** Whether this page is written yet, since a page can only be made hanging from one that exists. */
  readonly canMakeAPage: boolean;
  readonly editorViewRef: RefObject<EditorView | null>;
  readonly onEscapeWithSelection: (editorView: EditorView) => void;
  /** The pages this one already holds, which answer a name without asking anybody. */
  readonly pagesAtHand: readonly PageSummary[];
  /** The space this page belongs to, which is who a name after `@` may answer for once it means a person. */
  readonly spaceId: string;
  readonly surfaceRef: RefObject<HTMLDivElement | null>;
}

/** The trigger menu's own state and the operations that move it, kept apart from the rest of the editor. */
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
