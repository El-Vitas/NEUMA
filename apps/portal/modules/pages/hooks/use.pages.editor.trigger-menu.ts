'use client';

import { useTranslations } from 'next-intl';
import type { EditorView } from 'prosemirror-view';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PAGE_EDITOR_COMMANDS,
  SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
  SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
} from '../constants/pages.editor.constants';
import { computeSelectionToolbarPlacement } from '../lib/pages.editor.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import {
  buildEditorTriggerItems,
  getEditorTriggerAriaLabelKey,
  getEditorTriggerEmptyMessageKey,
  handleSlashMenuKeyDown,
  resolveEditorTrigger,
} from '../lib/pages.editor.slash-menu.lib';
import type {
  PagesEditorMenuItem,
  PagesEditorTrigger,
  PagesEditorTriggerKind,
  PagesEditorTriggerMenu,
  PagesEditorTriggerMenuParameters,
} from '../types/pages.editor.slash-menu.types';
import type { PageEditorSpot } from '../types/pages.editor.surface.types';
import { usePagesMentionSearch } from './use.pages.mention-search';

/**
 * The menu that opens beside the cursor on `/` or `@`: what it shows, how it
 * is placed, and how the keyboard steps through it — kept apart from the rest
 * of the editor, which only asks it to answer a keypress or watch a selection.
 */
export const usePagesEditorTriggerMenu = ({
  editorViewRef,
  onEscapeWithSelection,
  surfaceRef,
}: PagesEditorTriggerMenuParameters): PagesEditorTriggerMenu => {
  const t = useTranslations('pages');
  const [recentCommandIds, setRecentCommandIds] = useState<readonly string[]>([]);
  const [triggerKind, setTriggerKind] = useState<PagesEditorTriggerKind | null>(null);
  const [triggerQuery, setTriggerQuery] = useState<string | null>(null);
  const [triggerSelectedIndex, setTriggerSelectedIndex] = useState(0);
  const [triggerMenuPosition, setTriggerMenuPosition] = useState<PageEditorSpot | null>(null);
  const triggerQueryRef = useRef<string | null>(null);
  const triggerMenuPositionRef = useRef<PageEditorSpot | null>(null);
  const triggerSelectedIndexRef = useRef(0);
  const mentionSearch = usePagesMentionSearch(triggerKind === 'mention' ? triggerQuery : null);

  const translateCommandLabel = useCallback((labelKey: string) => t(`commands.${labelKey}`), [t]);
  const triggerItems = useMemo<readonly PagesEditorMenuItem[]>(
    () =>
      buildEditorTriggerItems({
        commands: PAGE_EDITOR_COMMANDS,
        mentionCandidates: mentionSearch.candidates,
        recentCommandIds,
        schema: pageEditorSchema,
        translateCommandLabel,
        triggerKind,
        triggerQuery,
      }),
    [mentionSearch.candidates, recentCommandIds, translateCommandLabel, triggerKind, triggerQuery],
  );
  const triggerItemsRef = useRef(triggerItems);

  useEffect(() => {
    triggerItemsRef.current = triggerItems;
  }, [triggerItems]);

  const triggerEmptyMessage = t(getEditorTriggerEmptyMessageKey(triggerKind, mentionSearch.isLoading));
  const triggerAriaLabel = t(getEditorTriggerAriaLabelKey(triggerKind));

  const computeMenuPosition = useCallback(
    (editorView: EditorView, fromPos: number, toPos: number): PageEditorSpot | null => {
      const surfaceElement = surfaceRef.current;
      if (surfaceElement === null) return null;
      const surfaceRect = surfaceElement.getBoundingClientRect();
      const startCoords = editorView.coordsAtPos(fromPos);
      const endCoords = editorView.coordsAtPos(toPos);
      const placement = computeSelectionToolbarPlacement({
        selectionEndCoords: endCoords,
        selectionStartCoords: startCoords,
        surfaceRect: { left: surfaceRect.left, top: surfaceRect.top, width: surfaceRect.width },
        toolbarHeight: SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
        toolbarWidth: SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
      });
      return { left: placement.left, top: placement.top };
    },
    [surfaceRef],
  );

  /** The place the menu stands is kept twice: read on the next render, and read at once by a keypress. */
  const rememberTriggerMenuPosition = useCallback((position: PageEditorSpot | null): void => {
    triggerMenuPositionRef.current = position;
    setTriggerMenuPosition(position);
  }, []);

  const closeTriggerMenu = useCallback((): void => {
    triggerQueryRef.current = null;
    triggerSelectedIndexRef.current = 0;
    setTriggerKind(null);
    setTriggerQuery(null);
    setTriggerSelectedIndex(0);
    rememberTriggerMenuPosition(null);
  }, [rememberTriggerMenuPosition]);

  const updateEditorTrigger = useCallback((text: string): PagesEditorTrigger | null => {
    const trigger = resolveEditorTrigger(text);
    triggerQueryRef.current = trigger?.query ?? null;
    triggerSelectedIndexRef.current = 0;
    setTriggerKind(trigger?.kind ?? null);
    setTriggerQuery(trigger?.query ?? null);
    setTriggerSelectedIndex(0);
    return trigger;
  }, []);

  const selectTriggerCommand = useCallback(
    (item: PagesEditorMenuItem): void => {
      const command = item.run;
      setRecentCommandIds((previous) => [item.id, ...previous.filter((id) => id !== item.id)].slice(0, 3));
      const editorView = editorViewRef.current;
      const query = triggerQueryRef.current;
      if (editorView === null || query === null) return;
      const triggerStart = editorView.state.selection.from - query.length - 1;
      if (triggerStart < 1) return;
      editorView.dispatch(editorView.state.tr.delete(triggerStart, editorView.state.selection.from));
      command(editorView.state, editorView.dispatch);
      closeTriggerMenu();
      editorView.focus();
    },
    [closeTriggerMenu, editorViewRef],
  );

  /**
   * The menu open beside the cursor answers the keyboard first; otherwise the
   * editor keeps its own behaviour, only stepping aside so Escape can leave a
   * selection behind.
   */
  const answerKeyPress = useCallback(
    (editorView: EditorView, event: KeyboardEvent): boolean => {
      if (triggerQueryRef.current !== null && triggerMenuPositionRef.current !== null) {
        return handleSlashMenuKeyDown({
          event,
          items: triggerItemsRef.current,
          onClose: closeTriggerMenu,
          onSelect: selectTriggerCommand,
          onSelectedIndexChange: (index) => {
            triggerSelectedIndexRef.current = index;
            setTriggerSelectedIndex(index);
          },
          selectedIndex: triggerSelectedIndexRef.current,
        });
      }
      if (event.key === 'Escape' && !editorView.state.selection.empty) onEscapeWithSelection(editorView);
      return false;
    },
    [closeTriggerMenu, onEscapeWithSelection, selectTriggerCommand],
  );

  return {
    answerKeyPress,
    computeMenuPosition,
    selectTriggerCommand,
    rememberTriggerMenuPosition,
    triggerAriaLabel,
    triggerEmptyMessage,
    triggerItems,
    triggerMenuPosition,
    triggerQuery,
    triggerSelectedIndex,
    updateEditorTrigger,
  };
};
