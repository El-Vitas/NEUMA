'use client';

import { useTranslations } from 'next-intl';
import type { Command } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  type DragEvent,
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { PAGE_EDITOR_COMMANDS, PAGE_EDITOR_SURFACE_CLASS_NAME } from '../constants/pages.editor.constants';
import { PAGE_EDITOR_QUIET_SURFACE } from '../constants/pages.editor.surface.constants';
import { usePagesAttachmentUpload } from '../hooks/use.pages.attachment.upload';
import { usePagesCollaboration } from '../hooks/use.pages.collaboration';
import { usePagesEditorBlockActions } from '../hooks/use.pages.editor.block-actions';
import { usePagesEditorBlockArrival } from '../hooks/use.pages.editor.block-arrival';
import { usePagesEditorBlocksToPage } from '../hooks/use.pages.editor.blocks-to-page';
import { usePagesEditorCollectionHosts } from '../hooks/use.pages.editor.collection-hosts';
import { usePagesEditorPageDrop } from '../hooks/use.pages.editor.page-drop';
import { usePagesEditorTriggerMenu } from '../hooks/use.pages.editor.trigger-menu';
import { createCollaborativePageEditorState } from '../lib/pages.collaboration.lib';
import { openPageEditorFragmentComments } from '../lib/pages.editor.block-menu.lib';
import { findSelectedPageBlocks } from '../lib/pages.editor.block-range.lib';
import { appendParagraphAtEnd } from '../lib/pages.editor.commands';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
import {
  createPageEditorState,
  isPageEditorReadOnly,
  runPageEditorCommand,
  serializePageEditorState,
  usesCommandKeyboard,
} from '../lib/pages.editor.lib';
import { createPageEditorNodeViews } from '../lib/pages.editor.node-views.lib';
import { describeEditorWithTriggerMenu } from '../lib/pages.editor.slash-menu.lib';
import { readPageEditorSurface } from '../lib/pages.editor.surface.lib';
import type { AttachmentSummary } from '../types/pages.attachments.types';
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
    const unsupportedLabelRef = useRef(t('unsupportedBlock'));
    const insertBlockLabelRef = useRef(t('insertBlock'));
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
    usePagesEditorPageDrop({ editorViewRef, spaceId });
    const turnBlocksIntoPage = usePagesEditorBlocksToPage({ editorViewRef, spaceId });

    /** The blocks the menu is open for become a page held by the one being written. */
    const becomePage = useCallback((): void => {
      const editorView = editorViewRef.current;
      const chosen = editorView === null ? null : findSelectedPageBlocks(editorView.state);
      if (editorView === null || chosen === null || pageId === null) return;
      blockActions.close('actions');
      turnBlocksIntoPage({ leaveLink: true, parentPageId: pageId, range: { from: chosen.start, to: chosen.end } });
    }, [blockActions, pageId, turnBlocksIntoPage]);

    const dismissSelectionToolbar = useCallback((editorView: EditorView): void => {
      const collapsedSelection = TextSelection.create(editorView.state.doc, editorView.state.selection.from);
      editorView.dispatch(editorView.state.tr.setSelection(collapsedSelection));
      editorView.focus();
    }, []);

    const {
      answerKeyPress,
      computeMenuPosition,
      rememberTriggerMenuPosition,
      selectTriggerCommand,
      triggerAriaLabel,
      triggerEmptyMessage,
      triggerItems,
      triggerMenuPosition,
      triggerQuery,
      triggerSelectedIndex,
      updateEditorTrigger,
    } = usePagesEditorTriggerMenu({
      editorViewRef,
      onEscapeWithSelection: dismissSelectionToolbar,
      surfaceRef,
    });

    const triggerMenuId = useId();
    const isTriggerMenuOpen = canEdit && triggerQuery !== null && triggerMenuPosition !== null;
    const activeTriggerItemId = isTriggerMenuOpen ? (triggerItems[triggerSelectedIndex]?.id ?? null) : null;

    /** A reader never leaves the editable text to reach the menu, so the editor speaks for it. */
    useEffect(() => {
      editorViewRef.current?.setProps({
        attributes: describeEditorWithTriggerMenu(triggerMenuId, activeTriggerItemId),
      });
    }, [activeTriggerItemId, triggerMenuId]);

    useEffect(() => {
      contentCallbackRef.current = onContentChange;
    }, [onContentChange]);

    useEffect(() => {
      setUsesCommandKey(usesCommandKeyboard(navigator.userAgent));
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
          rememberTriggerMenuPosition(
            trigger === null ? null : computeMenuPosition(editorView, selection.from, selection.from),
          );
          setSurface(readPageEditorSurface(editorView, nextState, readSurfaceRect()));
        },
        editable: () => !isPageEditorReadOnly(canEdit),
        handleKeyDown: answerKeyPress,
        nodeViews: createPageEditorNodeViews({
          collection: collectionLabelRef.current,
          task: taskLabelRef.current,
          unsupported: unsupportedLabelRef.current,
        }),
        state: editorState,
      });
      editorViewRef.current = editorView;
      syncCollectionHosts();

      return () => {
        editorView.destroy();
        editorViewRef.current = null;
      };
    }, [
      answerKeyPress,
      canEdit,
      computeMenuPosition,
      readSurfaceRect,
      rememberTriggerMenuPosition,
      syncCollectionHosts,
      updateEditorTrigger,
    ]);

    useEffect(() => {
      if (session === null || editorViewRef.current === null) return;
      editorViewRef.current.updateState(
        createCollaborativePageEditorState(
          { awareness: session.provider.awareness, fragment: session.fragment },
          selectBlockLabelRef.current,
          insertBlockLabelRef.current,
        ),
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
          {isTriggerMenuOpen && triggerMenuPosition !== null && (
            <div
              className="absolute z-20 w-56"
              style={{ left: `${triggerMenuPosition.left}px`, top: `${triggerMenuPosition.top}px` }}
            >
              <PagesEditorSlashMenu
                emptyMessage={triggerEmptyMessage}
                id={triggerMenuId}
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
              onBecomePage={becomePage}
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
