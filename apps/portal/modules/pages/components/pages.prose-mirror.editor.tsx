'use client';

import { useTranslations } from 'next-intl';
import type { Command, Selection } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  type DragEvent,
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PAGE_EDITOR_COMMANDS,
  PAGE_EDITOR_SURFACE_CLASS_NAME,
  SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
  SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
} from '../constants/pages.editor.constants';
import { usePagesAttachmentUpload } from '../hooks/use.pages.attachment.upload';
import { usePagesCollaboration } from '../hooks/use.pages.collaboration';
import { usePagesMentionSearch } from '../hooks/use.pages.mention-search';
import { createCollaborativePageEditorState, getCollaborationStatusLabelKey } from '../lib/pages.collaboration.lib';
import {
  computeSelectionToolbarPlacement,
  createPageEditorState,
  isPageEditorReadOnly,
  runPageEditorCommand,
  serializePageEditorState,
} from '../lib/pages.editor.lib';
import { createPageEditorNodeViews } from '../lib/pages.editor.node-views.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import {
  buildEditorTriggerItems,
  getEditorTriggerAriaLabelKey,
  getEditorTriggerEmptyMessageKey,
  handleSlashMenuKeyDown,
  resolveEditorTrigger,
} from '../lib/pages.editor.slash-menu.lib';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PagesEditorMenuItem, PagesEditorTriggerKind } from '../types/pages.editor.slash-menu.types';
import type { PageContent } from '../types/pages.types';
import { PagesEditorAttachmentUpload } from './pages.editor.attachment.upload';
import { PagesEditorSlashMenu } from './pages.editor.slash-menu';
import { PagesEditorToolbar } from './pages.editor.toolbar';

interface IProps {
  readonly canEdit: boolean;
  readonly content: PageContent;
  readonly currentUserDisplayName?: string;
  readonly onAttachmentUploaded?: (attachment: AttachmentSummary) => void;
  readonly onContentChange: (content: PageContent) => void;
  readonly pageId: string | null;
}

export const PagesProseMirrorEditor = forwardRef(
  (
    { canEdit, content, currentUserDisplayName, onAttachmentUploaded, onContentChange, pageId }: IProps,
    handleRef: ForwardedRef<{ readonly runCommand: (command: Command) => boolean }>,
  ) => {
    const t = useTranslations('pages');
    const { participants, session, status } = usePagesCollaboration(
      pageId,
      canEdit,
      content,
      currentUserDisplayName ?? null,
    );
    const editorHostRef = useRef<HTMLDivElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const contentCallbackRef = useRef(onContentChange);
    const initialContentRef = useRef(content);
    const [selectionToolbarPosition, setSelectionToolbarPosition] = useState<{
      readonly left: number;
      readonly top: number;
    } | null>(null);
    const [triggerMenuPosition, setTriggerMenuPosition] = useState<{
      readonly left: number;
      readonly top: number;
    } | null>(null);
    const [triggerKind, setTriggerKind] = useState<PagesEditorTriggerKind | null>(null);
    const [triggerQuery, setTriggerQuery] = useState<string | null>(null);
    const [triggerSelectedIndex, setTriggerSelectedIndex] = useState(0);
    const triggerQueryRef = useRef<string | null>(null);
    const triggerMenuPositionRef = useRef<{ readonly left: number; readonly top: number } | null>(null);
    const triggerSelectedIndexRef = useRef(0);
    const mentionSearch = usePagesMentionSearch(triggerKind === 'mention' ? triggerQuery : null);
    const reportUploadedAttachment = useCallback(
      (attachment: AttachmentSummary): void => onAttachmentUploaded?.(attachment),
      [onAttachmentUploaded],
    );
    const attachmentUpload = usePagesAttachmentUpload({ onUploaded: reportUploadedAttachment, pageId });
    const uploadAttachmentRef = useRef(attachmentUpload.upload);

    useEffect(() => {
      uploadAttachmentRef.current = attachmentUpload.upload;
    }, [attachmentUpload.upload]);

    const uploadDroppedFile = useCallback(
      (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        if (!canEdit || pageId === null) return;
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile === undefined) return;
        uploadAttachmentRef.current(droppedFile);
      },
      [canEdit, pageId],
    );

    const translateCommandLabel = useCallback((labelKey: string) => t(`commands.${labelKey}`), [t]);
    const triggerItems = useMemo<readonly PagesEditorMenuItem[]>(
      () =>
        buildEditorTriggerItems({
          commands: PAGE_EDITOR_COMMANDS,
          mentionCandidates: mentionSearch.candidates,
          schema: pageEditorSchema,
          translateCommandLabel,
          triggerKind,
          triggerQuery,
        }),
      [mentionSearch.candidates, translateCommandLabel, triggerKind, triggerQuery],
    );
    const triggerItemsRef = useRef(triggerItems);

    useEffect(() => {
      triggerItemsRef.current = triggerItems;
    }, [triggerItems]);

    const triggerEmptyMessage = t(getEditorTriggerEmptyMessageKey(triggerKind, mentionSearch.isLoading));
    const triggerAriaLabel = t(getEditorTriggerAriaLabelKey(triggerKind));

    const computeMenuPosition = useCallback(
      (
        editorView: EditorView,
        fromPos: number,
        toPos: number,
      ): { readonly left: number; readonly top: number } | null => {
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
      [],
    );

    const computeSelectionToolbarPosition = useCallback(
      (editorView: EditorView, selection: Selection): { readonly left: number; readonly top: number } | null =>
        selection.empty ? null : computeMenuPosition(editorView, selection.from, selection.to),
      [computeMenuPosition],
    );

    const dismissSelectionToolbar = useCallback((editorView: EditorView): void => {
      const collapsedSelection = TextSelection.create(editorView.state.doc, editorView.state.selection.from);
      editorView.dispatch(editorView.state.tr.setSelection(collapsedSelection));
      editorView.focus();
    }, []);

    const closeTriggerMenu = useCallback((): void => {
      triggerQueryRef.current = null;
      triggerSelectedIndexRef.current = 0;
      triggerMenuPositionRef.current = null;
      setTriggerKind(null);
      setTriggerQuery(null);
      setTriggerSelectedIndex(0);
      setTriggerMenuPosition(null);
    }, []);

    const updateEditorTrigger = useCallback(
      (text: string): { readonly kind: PagesEditorTriggerKind; readonly query: string } | null => {
        const trigger = resolveEditorTrigger(text);
        triggerQueryRef.current = trigger?.query ?? null;
        triggerSelectedIndexRef.current = 0;
        setTriggerKind(trigger?.kind ?? null);
        setTriggerQuery(trigger?.query ?? null);
        setTriggerSelectedIndex(0);
        return trigger;
      },
      [],
    );

    const selectTriggerCommand = useCallback(
      (command: Command): void => {
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
      [closeTriggerMenu],
    );

    useEffect(() => {
      contentCallbackRef.current = onContentChange;
    }, [onContentChange]);

    useEffect(() => {
      const editorHost = editorHostRef.current;
      if (editorHost === null) return;

      const editorState = createPageEditorState(initialContentRef.current);
      const editorView = new EditorView(editorHost, {
        dispatchTransaction: (transaction) => {
          const nextState = editorView.state.apply(transaction);
          editorView.updateState(nextState);
          contentCallbackRef.current(serializePageEditorState(nextState));
          const selection = nextState.selection;
          const trigger = updateEditorTrigger(
            selection.empty ? selection.$from.parent.textContent.slice(0, selection.$from.parentOffset) : '',
          );
          const nextTriggerMenuPosition =
            trigger === null ? null : computeMenuPosition(editorView, selection.from, selection.from);
          triggerMenuPositionRef.current = nextTriggerMenuPosition;
          setTriggerMenuPosition(nextTriggerMenuPosition);
          setSelectionToolbarPosition(computeSelectionToolbarPosition(editorView, selection));
        },
        editable: () => !isPageEditorReadOnly(canEdit),
        handleKeyDown: (currentEditorView, event) => {
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
          if (event.key === 'Escape' && !currentEditorView.state.selection.empty) {
            event.preventDefault();
            dismissSelectionToolbar(currentEditorView);
            return true;
          }
          return false;
        },
        nodeViews: createPageEditorNodeViews(),
        state: editorState,
      });
      editorViewRef.current = editorView;

      return () => {
        editorView.destroy();
        editorViewRef.current = null;
      };
    }, [
      canEdit,
      closeTriggerMenu,
      computeMenuPosition,
      computeSelectionToolbarPosition,
      dismissSelectionToolbar,
      selectTriggerCommand,
      updateEditorTrigger,
    ]);

    useEffect(() => {
      if (session === null || editorViewRef.current === null) return;
      editorViewRef.current.updateState(createCollaborativePageEditorState(session));
    }, [session]);

    useImperativeHandle(
      handleRef,
      () => ({
        runCommand: (command) => {
          const editorView = editorViewRef.current;
          if (editorView === null) return false;
          return command(editorView.state, editorView.dispatch);
        },
      }),
      [],
    );

    const isDegradedCollaborationStatus = status === 'error' || status === 'disconnected' || status === 'exhausted';
    const collaborationStatusMessage =
      status === null
        ? ''
        : `${t(getCollaborationStatusLabelKey(status))}${isDegradedCollaborationStatus ? ` ${t('collaboration.fallback')}` : ''}`;

    return (
      <section aria-label={t('editor')} className="space-y-3">
        {pageId !== null && canEdit && status !== null && (
          <p
            aria-live="polite"
            className={status === 'connected' ? 'sr-only' : 'text-muted-foreground text-xs'}
            role="status"
          >
            {collaborationStatusMessage}
          </p>
        )}
        {pageId !== null && canEdit && participants.length > 0 && (
          <ul aria-label={t('collaboration.participants')} className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const participantDisplayName =
                participant.name.length > 0 ? participant.name : t('collaboration.participantFallback');
              return (
                <li key={participant.clientId}>
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full border-2 bg-background font-medium text-foreground text-xs"
                    style={{ borderColor: participant.color ?? undefined }}
                    title={participantDisplayName}
                  >
                    {participantDisplayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="sr-only">{participantDisplayName}</span>
                </li>
              );
            })}
          </ul>
        )}
        {canEdit && pageId !== null && (
          <div className="flex justify-end">
            <PagesEditorAttachmentUpload
              error={attachmentUpload.error}
              isPending={attachmentUpload.isPending}
              onFileSelected={attachmentUpload.upload}
              onRetry={attachmentUpload.retry}
            />
          </div>
        )}
        <div className={PAGE_EDITOR_SURFACE_CLASS_NAME} ref={surfaceRef}>
          {canEdit && triggerQuery !== null && triggerMenuPosition !== null && (
            <div
              className="absolute z-20 w-56"
              style={{ left: `${triggerMenuPosition.left}px`, top: `${triggerMenuPosition.top}px` }}
            >
              <PagesEditorSlashMenu
                emptyMessage={triggerEmptyMessage}
                items={triggerItems}
                label={triggerAriaLabel}
                onSelect={(item) => selectTriggerCommand(item.run)}
                selectedIndex={triggerSelectedIndex}
              />
            </div>
          )}
          <div
            className="w-full bg-surface py-4 text-base/7 outline-none"
            id="page-content"
            onDropCapture={uploadDroppedFile}
            ref={editorHostRef}
          />
          {canEdit && selectionToolbarPosition !== null && (
            <div
              className="absolute z-30"
              style={{ left: `${selectionToolbarPosition.left}px`, top: `${selectionToolbarPosition.top}px` }}
            >
              <PagesEditorToolbar
                commands={PAGE_EDITOR_COMMANDS}
                onDismiss={() => {
                  const editorView = editorViewRef.current;
                  if (editorView === null) return;
                  dismissSelectionToolbar(editorView);
                }}
                onRunCommand={(command) => {
                  const editorView = editorViewRef.current;
                  if (editorView === null) return;
                  runPageEditorCommand(editorView, command);
                  editorView.focus();
                }}
              />
            </div>
          )}
        </div>
      </section>
    );
  },
);
PagesProseMirrorEditor.displayName = 'PagesProseMirrorEditor';
