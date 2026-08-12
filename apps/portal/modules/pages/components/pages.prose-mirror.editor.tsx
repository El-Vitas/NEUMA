'use client';

import { useTranslations } from 'next-intl';
import type { Command, Selection } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  type DragEvent,
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  PAGE_EDITOR_COMMANDS,
  PAGE_EDITOR_SURFACE_CLASS_NAME,
  SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
  SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
} from '../constants/pages.editor.constants';
import { PAGE_EDITOR_QUIET_SURFACE } from '../constants/pages.editor.surface.constants';
import { usePagesAttachmentUpload } from '../hooks/use.pages.attachment.upload';
import { usePagesCollaboration } from '../hooks/use.pages.collaboration';
import { usePagesEditorBlockActions } from '../hooks/use.pages.editor.block-actions';
import { usePagesEditorBlockArrival } from '../hooks/use.pages.editor.block-arrival';
import { usePagesEditorCollectionHosts } from '../hooks/use.pages.editor.collection-hosts';
import { usePagesMentionSearch } from '../hooks/use.pages.mention-search';
import { createCollaborativePageEditorState } from '../lib/pages.collaboration.lib';
import { openPageEditorFragmentComments } from '../lib/pages.editor.block-menu.lib';
import { appendParagraphAtEnd } from '../lib/pages.editor.commands';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
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
import { readPageEditorSurface } from '../lib/pages.editor.surface.lib';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PagesEditorMenuItem, PagesEditorTriggerKind } from '../types/pages.editor.slash-menu.types';
import type { PageEditorSurfaceRect, PageEditorSurfaceState } from '../types/pages.editor.surface.types';
import type { PageContent } from '../types/pages.types';
import { PagesEditorAttachmentUpload } from './pages.editor.attachment.upload';
import { PagesEditorBlockActions } from './pages.editor.block-actions';
import { PagesEditorCollaborationStatus } from './pages.editor.collaboration.status';
import { PagesEditorShortcutsDialog } from './pages.editor.shortcuts.dialog';
import { PagesEditorSlashMenu } from './pages.editor.slash-menu';
import { PagesEditorToolbar } from './pages.editor.toolbar';

interface IProps {
  readonly canEdit: boolean;
  readonly content: PageContent;
  readonly currentUserDisplayName?: string;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly onAttachmentUploaded?: (attachment: AttachmentSummary) => void;
  readonly onContentChange: (content: PageContent) => void;
  readonly pageId: string | null;
  readonly spaceId: string;
}

export const PagesProseMirrorEditor = forwardRef(
  (
    {
      canEdit,
      content,
      currentUserDisplayName,
      embeddedCollections = {},
      onAttachmentUploaded,
      onContentChange,
      pageId,
      spaceId,
    }: IProps,
    handleRef: ForwardedRef<{ readonly runCommand: (command: Command) => boolean }>,
  ) => {
    const t = useTranslations('pages');
    const selectBlockLabelRef = useRef(t('selectBlock'));
    const collectionLabelRef = useRef(t('collectionBlock'));
    const taskLabelRef = useRef(t('taskBlock'));
    const blockCommentsLabelRef = useRef(t('blockComments'));
    const insertBlockLabelRef = useRef(t('insertBlock'));
    const [recentCommandIds, setRecentCommandIds] = useState<readonly string[]>([]);
    const [surface, setSurface] = useState<PageEditorSurfaceState>(PAGE_EDITOR_QUIET_SURFACE);
    const [usesCommandKey, setUsesCommandKey] = useState(false);

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

    const _computeSelectionToolbarPosition = useCallback(
      (editorView: EditorView, selection: Selection): { readonly left: number; readonly top: number } | null =>
        selection.empty ? null : computeMenuPosition(editorView, selection.from, selection.to),
      [computeMenuPosition],
    );

    /** The editor's own box, which every menu is placed against. */
    const readSurfaceRect = useCallback((): PageEditorSurfaceRect | null => {
      const surfaceElement = surfaceRef.current;
      if (surfaceElement === null) return null;
      const rect = surfaceElement.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width };
    }, []);

    const collections = usePagesEditorCollectionHosts(editorHostRef);
    const syncCollectionHosts = collections.sync;
    const blockActions = usePagesEditorBlockActions(editorViewRef);
    usePagesEditorBlockArrival(editorHostRef);

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
      [closeTriggerMenu],
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
        if (event.key === 'Escape' && !editorView.state.selection.empty) dismissSelectionToolbar(editorView);
        return false;
      },
      [closeTriggerMenu, dismissSelectionToolbar, selectTriggerCommand],
    );

    useEffect(() => {
      contentCallbackRef.current = onContentChange;
    }, [onContentChange]);

    useEffect(() => {
      setUsesCommandKey(navigator.platform.toLowerCase().includes('mac'));
    }, []);

    useEffect(() => {
      const editorHost = editorHostRef.current;
      if (editorHost === null) return;

      const editorState = createPageEditorState(
        initialContentRef.current,
        selectBlockLabelRef.current,
        insertBlockLabelRef.current,
        blockCommentsLabelRef.current,
      );
      const editorView = new EditorView(editorHost, {
        dispatchTransaction: (transaction) => {
          const nextState = editorView.state.apply(transaction);
          editorView.updateState(nextState);
          if (transaction.docChanged) contentCallbackRef.current(serializePageEditorState(nextState));
          syncCollectionHosts();
          const selection = nextState.selection;
          const trigger = updateEditorTrigger(
            selection.empty ? selection.$from.parent.textContent.slice(0, selection.$from.parentOffset) : '',
          );
          const nextTriggerMenuPosition =
            trigger === null ? null : computeMenuPosition(editorView, selection.from, selection.from);
          triggerMenuPositionRef.current = nextTriggerMenuPosition;
          setTriggerMenuPosition(nextTriggerMenuPosition);
          setSurface(readPageEditorSurface(editorView, nextState, readSurfaceRect()));
        },
        editable: () => !isPageEditorReadOnly(canEdit),
        handleKeyDown: answerKeyPress,
        nodeViews: createPageEditorNodeViews({ collection: collectionLabelRef.current, task: taskLabelRef.current }),
        state: editorState,
      });
      editorViewRef.current = editorView;
      syncCollectionHosts();

      return () => {
        editorView.destroy();
        editorViewRef.current = null;
      };
    }, [answerKeyPress, canEdit, computeMenuPosition, updateEditorTrigger, readSurfaceRect, syncCollectionHosts]);

    useEffect(() => {
      if (session === null || editorViewRef.current === null) return;
      editorViewRef.current.updateState(
        createCollaborativePageEditorState(session, selectBlockLabelRef.current, insertBlockLabelRef.current),
      );
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

    return (
      <section aria-label={t('editor')} className="space-y-3">
        {pageId !== null && canEdit && <PagesEditorCollaborationStatus participants={participants} status={status} />}
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
                onSelect={selectTriggerCommand}
                selectedIndex={triggerSelectedIndex}
              />
            </div>
          )}
          <div
            className="w-full bg-surface py-4 font-reading text-base leading-[1.6] outline-none"
            id="page-content"
            onDropCapture={uploadDroppedFile}
            ref={editorHostRef}
          />
          {collections.hosts.map(({ element, pageId: collectionPageId }) =>
            createPortal(embeddedCollections[collectionPageId] ?? null, element, collectionPageId),
          )}
          {surface.selectedBlockCount > 1 && (
            <p
              aria-live="polite"
              className="pointer-events-none absolute top-2 right-2 border border-border bg-surface px-2 py-1 text-muted-foreground text-xs"
            >
              {t('selectedBlocks', { count: surface.selectedBlockCount })}
            </p>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                className="flex min-h-11 items-center text-left text-muted-foreground text-sm hover:text-foreground"
                onClick={() => {
                  const editorView = editorViewRef.current;
                  if (editorView === null) return;
                  appendParagraphAtEnd(editorView.state, editorView.dispatch);
                  editorView.focus();
                }}
                type="button"
              >
                {t('appendBlock')}
              </button>
              <PagesEditorShortcutsDialog usesCommandKey={usesCommandKey} />
            </div>
          )}
          {canEdit && surface.toolbarPosition !== null && (
            <div
              className="absolute z-30"
              style={{ left: `${surface.toolbarPosition.left}px`, top: `${surface.toolbarPosition.top}px` }}
            >
              <PagesEditorToolbar
                commands={PAGE_EDITOR_COMMANDS}
                conversions={surface.conversions}
                onComment={() => {
                  const editorView = editorViewRef.current;
                  if (editorView === null) return;
                  openPageEditorFragmentComments(editorView);
                }}
                onConvert={(targetId) => {
                  const editorView = editorViewRef.current;
                  if (editorView === null) return;
                  createPageEditorBlockConversionCommand(targetId)(editorView.state, editorView.dispatch);
                  editorView.focus();
                }}
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
          {canEdit && (
            <PagesEditorBlockActions
              authorName={currentUserDisplayName ?? t('collaboration.participantFallback')}
              colors={surface.colors}
              comments={surface.comments}
              conversions={surface.conversions}
              hasIdentity={surface.blockId !== null}
              menuPosition={surface.menuPosition}
              onAsk={blockActions.ask}
              onClose={blockActions.close}
              onCopyLink={blockActions.copyLink}
              onHandOver={blockActions.handOver}
              onRunCommand={blockActions.runCommand}
              pageId={pageId}
              request={surface.request}
              spaceId={spaceId}
            />
          )}
        </div>
      </section>
    );
  },
);
PagesProseMirrorEditor.displayName = 'PagesProseMirrorEditor';
