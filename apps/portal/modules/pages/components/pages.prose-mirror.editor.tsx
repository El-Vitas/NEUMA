'use client';

import { PAGE_CODE_LANGUAGES } from '@company-brain/shared';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Command, EditorState } from 'prosemirror-state';
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
  useTransition,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { EMPTY_PAGE_SUMMARIES } from '../constants/pages.constants';
import { PAGE_EDITOR_COMMANDS, PAGE_EDITOR_SURFACE_CLASS_NAME } from '../constants/pages.editor.constants';
import { PAGE_EDITOR_QUIET_SURFACE } from '../constants/pages.editor.surface.constants';
import { usePagesAttachmentUpload } from '../hooks/use.pages.attachment.upload';
import { usePagesCollaboration } from '../hooks/use.pages.collaboration';
import { usePagesEditorBlockActions } from '../hooks/use.pages.editor.block-actions';
import { usePagesEditorBlockArrival } from '../hooks/use.pages.editor.block-arrival';
import { usePagesEditorBlocksToPage } from '../hooks/use.pages.editor.blocks-to-page';
import { usePagesEditorCollectionHosts } from '../hooks/use.pages.editor.collection-hosts';
import { usePagesEditorPageDrop } from '../hooks/use.pages.editor.page-drop';
import { usePagesEditorPastedLink } from '../hooks/use.pages.editor.pasted-link';
import { usePagesEditorTriggerMenu } from '../hooks/use.pages.editor.trigger-menu';
import { createCollaborativePageEditorState } from '../lib/pages.collaboration.lib';
import { describeANewCollection, readTheViewToShow } from '../lib/pages.collections.lib';
import { openPageEditorFragmentComments } from '../lib/pages.editor.block-menu.lib';
import { findSelectedPageBlocks } from '../lib/pages.editor.block-range.lib';
import { createPageCollectionInsertCommand } from '../lib/pages.editor.collection.lib';
import { appendParagraphAtEnd } from '../lib/pages.editor.commands';
import { followThePageHeadings, goToThePageHeading } from '../lib/pages.editor.contents.lib';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
import {
  createEmptyPageContent,
  createPageEditorState,
  isPageEditorReadOnly,
  readWhatThePageCanKeep,
  runPageEditorCommand,
  usesCommandKeyboard,
} from '../lib/pages.editor.lib';
import { createPageEditorNodeViews } from '../lib/pages.editor.node-views.lib';
import { createPageShapeCommand } from '../lib/pages.editor.page-shape.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import { describeEditorWithTriggerMenu } from '../lib/pages.editor.slash-menu.lib';
import { createPageSubpageInsertCommand, readPageTitleFrom } from '../lib/pages.editor.subpage.lib';
import { readPageEditorSurface } from '../lib/pages.editor.surface.lib';
import { createPageAction } from '../server/actions/pages.actions';
import { createPageCollectionAction, readPageCollectionAction } from '../server/actions/pages.collections.actions';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';
import type { PageDestination } from '../types/pages.editor.destination.types';
import type { PageEditorPageShape } from '../types/pages.editor.page-shape.types';
import type { PageEditorSurfaceRect, PageEditorSurfaceState } from '../types/pages.editor.surface.types';
import type { PageSchema } from '../types/pages.schema.types';
import type { PageContent, PageSummary } from '../types/pages.types';
import { PagesEditorAttachmentUpload } from './pages.editor.attachment.upload';
import { PagesEditorBlockActions } from './pages.editor.block-actions';
import { PagesEditorCollaborationStatus } from './pages.editor.collaboration.status';
import { PagesEditorLinkShapeMenu } from './pages.editor.link-shape.menu';
import { PagesEditorPagePickerDialog } from './pages.editor.page-picker.dialog';
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
  readonly onHeadingsChange?: (headings: readonly PageEditorHeading[]) => void;
  readonly pageId: string | null;
  /** The pages this one already knows about, which is how a block says what a page is called now. */
  readonly pages?: readonly PageSummary[];
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
      onHeadingsChange,
      pageId,
      pages = EMPTY_PAGE_SUMMARIES,
      spaceId,
    }: IProps,
    handleRef: ForwardedRef<{
      readonly goToHeading: (position: number) => void;
      readonly runCommand: (command: Command) => boolean;
    }>,
  ) => {
    const router = useRouter();
    const t = useTranslations('pages');
    const tErrors = useTranslations('errors');
    const [isMakingChild, startMakingChild] = useTransition();
    const [isChoosingCollection, setIsChoosingCollection] = useState(false);
    const selectBlockLabelRef = useRef(t('selectBlock'));
    const collectionLabelRef = useRef(t('collectionBlock'));
    const taskLabelRef = useRef(t('taskBlock'));
    const blockCommentsLabelRef = useRef(t('blockComments'));
    const unsupportedLabelRef = useRef(t('unsupportedBlock'));
    const insertBlockLabelRef = useRef(t('insertBlock'));
    const writeHereLabelRef = useRef(t('writeHere'));
    const foldHeadingLabelRef = useRef(t('foldHeading'));
    const blockTooLongLabelRef = useRef(t('blockTooLong'));
    const resizeColumnLabelRef = useRef(t('resizeColumn'));
    const subpageLabelsRef = useRef({ subpage: t('subpageBlock'), untitled: t('untitled') });
    const collectionWordingRef = useRef({
      firstProperty: t('collection.firstProperty'),
      firstView: t('collection.firstView'),
      titleProperty: t('collection.titleProperty'),
    });
    const newCollectionTitleRef = useRef(t('collection.newTitle'));
    const collectionSpotRef = useRef(0);
    const pagesRef = useRef(pages);
    const readPageTitleRef = useRef((childId: string): string | null => readPageTitleFrom(pagesRef.current, childId));
    const contentsLabelsRef = useRef({ empty: t('pageContentsEmpty'), title: t('pageContents') });
    /** Said once, and again only after the page has managed to keep something. */
    const toldOfTooMuchRef = useRef(false);
    const toggleLabelsRef = useRef({ open: t('openToggle'), title: t('toggleTitle') });
    const embedLabelsRef = useRef({
      providers: { figma: 'Figma', loom: 'Loom', vimeo: 'Vimeo', youtube: 'YouTube' },
      refused: t('embedRefused'),
      resize: t('resizeEmbed'),
    });
    const fileLabelsRef = useRef({ fullScreen: t('mediaFullScreen'), resize: t('resizeFile') });
    const imageLabelsRef = useRef({ caption: t('imageCaption'), resize: t('resizeImage') });
    const mediaLabelsRef = useRef({
      fullScreen: t('mediaFullScreen'),
      mute: t('mediaMute'),
      pause: t('mediaPause'),
      play: t('mediaPlay'),
      resize: t('resizeMedia'),
      seek: t('mediaSeek'),
      unmute: t('mediaUnmute'),
    });
    const codeLabelsRef = useRef({
      copied: t('codeCopied'),
      copy: t('copyCode'),
      diagram: {
        both: t('diagramView.both'),
        code: t('diagramView.code'),
        download: t('diagramDownload'),
        drawing: t('diagramView.drawing'),
        formula: {
          both: t('formulaView.both'),
          code: t('formulaView.code'),
          drawing: t('formulaView.drawing'),
        },
        fullScreen: t('diagramFullScreen'),
        line: t('diagramLine'),
        unknown: t('diagramUnknown'),
      },
      language: t('codeLanguage'),
      languages: Object.fromEntries(PAGE_CODE_LANGUAGES.map((language) => [language, t(`codeLanguages.${language}`)])),
      wrap: t('wrapCode'),
    });
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
    const headingsCallbackRef = useRef(onHeadingsChange);
    const followHeadingsRef = useRef(followThePageHeadings((headings) => headingsCallbackRef.current?.(headings)));
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

    /**
     * Taken apart on purpose: the editor is built once, and it is built again
     * whenever the hand it was given changes. A whole object handed over fresh
     * on every render is a new hand every time, and rebuilding the editor
     * reloads every video, every frame and every document on the page.
     */
    const pastedLink = usePagesEditorPastedLink(editorViewRef, readSurfaceRect);
    const { handlePastedLink } = pastedLink;

    /**
     * A picture on the clipboard becomes a picture on the page.
     *
     * Pasting is how an image most often arrives — from a screenshot, from
     * another page — and without this it arrived as nothing at all.
     */
    const uploadPastedFile = useCallback(
      (view: EditorView, event: ClipboardEvent): boolean => {
        const pastedFile = event.clipboardData?.files[0];
        if (!canEdit) return false;
        if (pastedFile !== undefined) {
          if (pageId === null) return false;
          event.preventDefault();
          uploadAttachmentRef.current(pastedFile);
          return true;
        }
        return handlePastedLink(view, event);
      },
      [canEdit, handlePastedLink, pageId],
    );

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
      headingsCallbackRef.current = onHeadingsChange;
    }, [onHeadingsChange]);

    useEffect(() => {
      pagesRef.current = pages;
    }, [pages]);

    /**
     * The page keeps what it can keep, and says so when it cannot.
     *
     * What the editor allows is wider than what a page accepts — a block longer
     * than the page holds, above all — and a page that quietly stops being kept
     * while somebody keeps writing it is the worst way for that to end.
     */
    const keepWhatCanBeKeptRef = useRef((state: EditorState): void => {
      const kept = readWhatThePageCanKeep(state);
      if (kept === null) {
        if (!toldOfTooMuchRef.current) toast.error(blockTooLongLabelRef.current);
        toldOfTooMuchRef.current = true;
        return;
      }
      toldOfTooMuchRef.current = false;
      contentCallbackRef.current(kept);
    });

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
        writeHereLabelRef.current,
        foldHeadingLabelRef.current,
        resizeColumnLabelRef.current,
      );
      const editorView = new EditorView(editorHost, {
        dispatchTransaction: (transaction) => {
          const nextState = editorView.state.apply(transaction);
          editorView.updateState(nextState);
          if (transaction.docChanged) {
            keepWhatCanBeKeptRef.current(nextState);
            followHeadingsRef.current(nextState);
          }
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
        handlePaste: uploadPastedFile,
        nodeViews: createPageEditorNodeViews(
          {
            code: codeLabelsRef.current,
            collection: collectionLabelRef.current,
            contents: contentsLabelsRef.current,
            embed: embedLabelsRef.current,
            file: fileLabelsRef.current,
            image: imageLabelsRef.current,
            media: mediaLabelsRef.current,
            subpage: subpageLabelsRef.current,
            task: taskLabelRef.current,
            toggle: toggleLabelsRef.current,
            unsupported: unsupportedLabelRef.current,
          },
          (childId) => readPageTitleRef.current(childId),
        ),
        state: editorState,
      });
      editorViewRef.current = editorView;
      syncCollectionHosts();
      followHeadingsRef.current(editorView.state);

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
      uploadPastedFile,
    ]);

    useEffect(() => {
      if (session === null || editorViewRef.current === null) return;
      editorViewRef.current.updateState(
        createCollaborativePageEditorState(
          { awareness: session.provider.awareness, fragment: session.fragment },
          selectBlockLabelRef.current,
          insertBlockLabelRef.current,
          writeHereLabelRef.current,
          foldHeadingLabelRef.current,
          resizeColumnLabelRef.current,
        ),
      );
      followHeadingsRef.current(editorViewRef.current.state);
    }, [session]);

    /**
     * Makes the page that will hang from this one, and leaves the line to it
     * where the writing was.
     *
     * The page is made first and named afterwards, the way a page is made
     * anywhere else here: what is written in it is written in the page itself,
     * so this one only has to say where it is.
     */
    const makeTheChildPage = (): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      if (pageId === null) {
        toast.error(t('subpageNeedsPage'));
        return;
      }
      /** Where the writing is now, said before the making begins, because it will not be there after. */
      const spot = editorView.state.selection.from;
      startMakingChild(async () => {
        const made = await createPageAction({
          content: createEmptyPageContent(),
          parentId: pageId,
          spaceId,
          title: subpageLabelsRef.current.untitled,
        });
        if (!isActionSuccess<PageSummary>(made)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(made)}`));
          return;
        }
        const insert = createPageSubpageInsertCommand(
          pageEditorSchema,
          { label: made.data.title, pageId: made.data.id, spaceId },
          spot,
        );
        insert(editorView.state, editorView.dispatch);
        editorView.focus();
        router.refresh();
      });
    };

    /**
     * Starts a collection and shows it here.
     *
     * A collection is a page with a shape, so it is made the way a page is made
     * and given the shape it starts with in the same breath; what lands in the
     * writing is the block that looks at it.
     */
    const makeTheCollection = (): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      if (pageId === null) {
        toast.error(t('collection.needsPage'));
        return;
      }
      const spot = editorView.state.selection.from;
      const shape = describeANewCollection(collectionWordingRef.current);
      startMakingChild(async () => {
        const made = await createPageCollectionAction({
          content: createEmptyPageContent(),
          parentId: pageId,
          properties: shape.properties,
          spaceId,
          title: newCollectionTitleRef.current,
          views: shape.views,
        });
        if (!isActionSuccess<PageSummary>(made)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(made)}`));
          return;
        }
        showTheCollection(editorView, { pageId: made.data.id, spaceId, viewName: shape.views[0]?.name ?? null }, spot);
        router.refresh();
      });
    };

    /** Puts the block that looks at a collection where the writing was, and goes on writing under it. */
    const showTheCollection = (
      editorView: EditorView,
      collection: { readonly pageId: string; readonly spaceId: string; readonly viewName: string | null },
      spot: number,
    ): void => {
      const insert = createPageCollectionInsertCommand(pageEditorSchema, collection, spot);
      insert(editorView.state, editorView.dispatch);
      editorView.focus();
    };

    /**
     * Shows a collection that lives somewhere else.
     *
     * The page is chosen first and asked about afterwards: nothing here knows
     * which pages are collections until each one is asked, and a page that is
     * not one says so instead of leaving an empty block on the page.
     */
    const showTheChosenCollection = (chosen: PageDestination): void => {
      const editorView = editorViewRef.current;
      setIsChoosingCollection(false);
      if (editorView === null) return;
      const spot = collectionSpotRef.current;
      startMakingChild(async () => {
        const asked = await readPageCollectionAction({ pageId: chosen.id, spaceId });
        if (!isActionSuccess<PageSchema | null>(asked)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(asked)}`));
          return;
        }
        if (asked.data === null || asked.data.properties.length === 0) {
          toast.error(t('collection.notACollection'));
          return;
        }
        showTheCollection(
          editorView,
          { pageId: chosen.id, spaceId, viewName: readTheViewToShow(asked.data.views) },
          spot,
        );
        router.refresh();
      });
    };

    /**
     * Shows the page this block names the other way round: the collection kept
     * in sight, or only the line that leads to it.
     *
     * Going back to the collection asks the page whether it still is one, since
     * a shape can be taken away from a page long after somebody wrote a block
     * that shows it.
     */
    const showThePageAs = (shape: PageEditorPageShape): void => {
      const editorView = editorViewRef.current;
      const target = surface.pageShape;
      if (editorView === null || target === null || target.chosen === shape) return;
      if (shape === 'link') {
        createPageShapeCommand(pageEditorSchema, shape, target, null)(editorView.state, editorView.dispatch);
        return;
      }
      startMakingChild(async () => {
        const asked = await readPageCollectionAction({ pageId: target.pageId, spaceId: target.spaceId });
        if (!isActionSuccess<PageSchema | null>(asked)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(asked)}`));
          return;
        }
        if (asked.data === null || asked.data.properties.length === 0) {
          toast.error(t('collection.notACollection'));
          return;
        }
        const viewName = readTheViewToShow(asked.data.views);
        createPageShapeCommand(pageEditorSchema, shape, target, viewName)(editorView.state, editorView.dispatch);
        router.refresh();
      });
    };

    useImperativeHandle(
      handleRef,
      () => ({
        goToHeading: (position) => {
          const editorView = editorViewRef.current;
          if (editorView === null) return;
          goToThePageHeading(editorView, position);
        },
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
        {/** Whoever knows how to make a page, kept where the menu can reach it and nobody else can. */}
        <button
          aria-hidden="true"
          className="hidden"
          data-page-subpage-request="true"
          disabled={isMakingChild}
          onClick={makeTheChildPage}
          tabIndex={-1}
          type="button"
        />
        <button
          aria-hidden="true"
          className="hidden"
          data-page-collection-request="true"
          disabled={isMakingChild}
          onClick={makeTheCollection}
          tabIndex={-1}
          type="button"
        />
        <button
          aria-hidden="true"
          className="hidden"
          data-page-collection-view-request="true"
          onClick={() => {
            const editorView = editorViewRef.current;
            if (editorView === null) return;
            collectionSpotRef.current = editorView.state.selection.from;
            setIsChoosingCollection(true);
          }}
          tabIndex={-1}
          type="button"
        />
        <PagesEditorPagePickerDialog
          exceptPageId={pageId}
          isOpen={isChoosingCollection}
          onCancel={() => setIsChoosingCollection(false)}
          onChoose={showTheChosenCollection}
          spaceId={spaceId}
          wording={{
            candidates: t('collectionCandidates'),
            description: t('collectionPickDescription'),
            search: t('collectionPickSearch'),
            title: t('collectionPickTitle'),
          }}
        />
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
          {collections.hosts.map(({ element, name, pageId: collectionPageId }) =>
            createPortal(embeddedCollections[collectionPageId] ?? null, element, name),
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
          {canEdit && pastedLink.pasted !== null && (
            <div
              className="absolute z-30"
              style={{ left: `${pastedLink.pasted.left}px`, top: `${pastedLink.pasted.top}px` }}
            >
              <PagesEditorLinkShapeMenu onChoose={pastedLink.choose} />
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
              blockAlign={surface.blockAlign}
              calloutIcon={surface.calloutIcon}
              colors={surface.colors}
              comments={surface.comments}
              conversions={surface.conversions}
              fileDisplay={surface.fileDisplay}
              foldState={surface.foldState}
              hasIdentity={surface.blockId !== null}
              isInTable={surface.isInTable}
              linkTarget={surface.linkTarget}
              menuPosition={surface.menuPosition}
              onAsk={blockActions.ask}
              onBecomePage={becomePage}
              onClose={blockActions.close}
              onCopyLink={blockActions.copyLink}
              onHandOver={blockActions.handOver}
              onLinkShape={pastedLink.shapeLink}
              onPageShape={showThePageAs}
              onRunCommand={blockActions.runCommand}
              pageId={pageId}
              pageShape={surface.pageShape}
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
