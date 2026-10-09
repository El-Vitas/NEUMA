'use client';

import type { PageLifecycle } from '@company-brain/shared';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
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
import { cn } from '@/lib/utils';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import {
  PAGE_APPEARANCE_DEFAULT_PREFERENCES,
  PAGE_APPEARANCE_TEXT_SIZE_STYLE_CLASSES,
  PAGE_APPEARANCE_TYPOGRAPHY_STYLE_CLASSES,
} from '../appearance/constants/pages.appearance.constants';
import type { PageAppearanceTextSize, PageAppearanceTypography } from '../appearance/types/pages.appearance.types';
import type { PageIcon } from '../appearance/types/pages.icon.types';
import { usePagesAttachmentUpload } from '../attachments/hooks/use.pages.attachment.upload';
import type { AttachmentSummary } from '../attachments/types/pages.attachments.types';
import {
  describeANewCollection,
  readEmbeddedCollectionKey,
  readTheViewToShow,
} from '../collections/lib/pages.collections.lib';
import { buildRowPropertyValues, getEditableSchemaProperties } from '../collections/lib/pages.properties.lib';
import { readPageCollectionAction } from '../collections/server/actions/pages.collections.actions';
import type { PagePersonOption, PageSchema } from '../collections/types/pages.schema.types';
import { EMPTY_PAGE_PERSON_OPTIONS, EMPTY_PAGE_SUMMARIES } from '../constants/pages.constants';
import { PagesEditorBlockActions } from '../editor/blocks/components/pages.editor.block-actions';
import { PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE } from '../editor/blocks/constants/pages.editor.blocks.constants';
import { usePagesEditorBlockActions } from '../editor/blocks/hooks/use.pages.editor.block-actions';
import { usePagesEditorBlockArrival } from '../editor/blocks/hooks/use.pages.editor.block-arrival';
import { usePagesEditorBlocksToPage } from '../editor/blocks/hooks/use.pages.editor.blocks-to-page';
import { openPageEditorFragmentComments } from '../editor/blocks/lib/pages.editor.block-menu.lib';
import { findSelectedPageBlocks } from '../editor/blocks/lib/pages.editor.block-range.lib';
import { createPageEditorBlockConversionCommand } from '../editor/blocks/lib/pages.editor.convert.lib';
import { createPageEditorNodeViews } from '../editor/blocks/lib/pages.editor.node-views.lib';
import { PagesEditorCollaborationStatus } from '../editor/components/pages.editor.collaboration.status';
import { PagesEditorPagePickerDialog } from '../editor/components/pages.editor.page-picker.dialog';
import { PagesEditorToolbar } from '../editor/components/pages.editor.toolbar';
import { PagesEditorViewPickerDialog } from '../editor/components/pages.editor.view-picker.dialog';
import { PAGE_EDITOR_COMMANDS, PAGE_EDITOR_SURFACE_CLASS_NAME } from '../editor/constants/pages.editor.constants';
import { usePagesEditorLiveBinding } from '../editor/hooks/use.pages.editor.live-binding';
import { isTheWritingStillInHand } from '../editor/lib/pages.editor.attention.lib';
import { appendParagraphAtEnd } from '../editor/lib/pages.editor.commands';
import { buildPageEditorLabels } from '../editor/lib/pages.editor.labels.lib';
import {
  createEmptyPageContent,
  createPageEditorState,
  goToTheWritingStart,
  isPageEditorReadOnly,
  readWhatThePageCanKeep,
  runPageEditorCommand,
  usesCommandKeyboard,
} from '../editor/lib/pages.editor.lib';
import { createPageMentionInsertAtCommand } from '../editor/lib/pages.editor.mention.lib';
import { pageEditorSchema } from '../editor/lib/pages.editor.schema';
import { PagesEditorAttachmentUpload } from '../editor/media/components/pages.editor.attachment.upload';
import { PagesEditorFindPanel } from '../editor/menus/components/pages.editor.find.panel';
import { PagesEditorLinkShapeMenu } from '../editor/menus/components/pages.editor.link-shape.menu';
import { PagesEditorShortcutsDialog } from '../editor/menus/components/pages.editor.shortcuts.dialog';
import { PagesEditorSlashMenu } from '../editor/menus/components/pages.editor.slash-menu';
import { PAGE_EDITOR_QUIET_SURFACE } from '../editor/menus/constants/pages.editor.surface.constants';
import { usePagesEditorFind } from '../editor/menus/hooks/use.pages.editor.find';
import { usePagesEditorPageDrop } from '../editor/menus/hooks/use.pages.editor.page-drop';
import { usePagesEditorTriggerMenu } from '../editor/menus/hooks/use.pages.editor.trigger-menu';
import { createPageShapeCommand } from '../editor/menus/lib/pages.editor.page-shape.lib';
import { describeEditorWithTriggerMenu } from '../editor/menus/lib/pages.editor.slash-menu.lib';
import { keepPageEditorSurfaceIfSame, readPageEditorSurface } from '../editor/menus/lib/pages.editor.surface.lib';
import type { PageDestination } from '../editor/menus/types/pages.editor.destination.types';
import type { PageEditorPageShape } from '../editor/menus/types/pages.editor.page-shape.types';
import type { PageEditorSurfaceRect, PageEditorSurfaceState } from '../editor/menus/types/pages.editor.surface.types';
import { usePagesEditorCollectionEmbedding } from '../editor/structure/hooks/use.pages.editor.collection-embedding';
import { usePagesEditorCollectionHosts } from '../editor/structure/hooks/use.pages.editor.collection-hosts';
import {
  createPageButtonCollectionCommand,
  createPageButtonWriteCommand,
  readThePressedButton,
  readTheRowContent,
  readTheRowTitle,
} from '../editor/structure/lib/pages.editor.button.lib';
import { followThePageHeadings, goToThePageHeading } from '../editor/structure/lib/pages.editor.contents.lib';
import {
  createPageSubpageInsertCommand,
  readPageIconFrom,
  readPageLifecycleFrom,
  readPageTitleFrom,
} from '../editor/structure/lib/pages.editor.subpage.lib';
import { createPageUnsyncCommand, readBorrowedBlock } from '../editor/structure/lib/pages.editor.synced.lib';
import type { PageEditorHeading } from '../editor/structure/types/pages.editor.contents.types';
import { PagesEditorLinkLayer } from '../editor/text/components/pages.editor.link.layer';
import { usePagesEditorPastedLink } from '../editor/text/hooks/use.pages.editor.pasted-link';
import {
  createPageLinkCommand,
  isWithinThePages,
  readTheLinkInHand,
  readTheLinkUnderPointer,
} from '../editor/text/lib/pages.editor.link.lib';
import { createPageTextColorCommand } from '../editor/text/lib/pages.editor.text-color.lib';
import type { PageEditorLinkAtHand } from '../editor/text/types/pages.editor.link.types';
import { usePagesCollaboration } from '../hooks/use.pages.collaboration';
import { PagesPreviewLayer } from '../links/components/pages.preview.layer';
import { usePagesPreview } from '../links/hooks/use.pages.preview';
import { resolveInternalPageHref } from '../navigation/lib/pages.side-panel.lib';
import { createPageAction } from '../server/actions/pages.actions';
import type { PageContent, PageSummary } from '../types/pages.types';

interface IProps {
  readonly canEdit: boolean;
  readonly content: PageContent;
  readonly currentUserDisplayName?: string;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly onAttachmentUploaded?: (attachment: AttachmentSummary) => void;
  /** `isKeptLive` is true when the live document already stores the page, so nothing has to be sent. */
  readonly onContentChange: (content: PageContent, isKeptLive: boolean) => void;
  readonly onHeadingsChange?: (headings: readonly PageEditorHeading[]) => void;
  /** Follows internal page links without leaving the current view, e.g. inside a side panel. */
  readonly onNavigateToPage?: (spaceId: string, pageId: string) => void;
  readonly pageId: string | null;
  readonly pages?: readonly PageSummary[];
  readonly personOptions?: readonly PagePersonOption[];
  readonly spaceId: string;
  readonly textSize?: PageAppearanceTextSize;
  readonly typography?: PageAppearanceTypography;
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
      onNavigateToPage,
      pageId,
      pages = EMPTY_PAGE_SUMMARIES,
      personOptions = EMPTY_PAGE_PERSON_OPTIONS,
      spaceId,
      textSize = PAGE_APPEARANCE_DEFAULT_PREFERENCES.textSize,
      typography = PAGE_APPEARANCE_DEFAULT_PREFERENCES.typography,
    }: IProps,
    handleRef: ForwardedRef<{
      readonly goToHeading: (position: number) => void;
      readonly goToWriting: () => void;
      readonly runCommand: (command: Command) => boolean;
    }>,
  ) => {
    const router = useRouter();
    const t = useTranslations('pages');
    const locale = useLocale();
    const tErrors = useTranslations('errors');
    const [isMakingChild, startMakingChild] = useTransition();
    const [isChoosingCollection, setIsChoosingCollection] = useState(false);
    const [isWritingInHand, setIsWritingInHand] = useState(true);
    const [linkInHand, setLinkInHand] = useState<PageEditorLinkAtHand | null>(null);
    const [linkUnderPointer, setLinkUnderPointer] = useState<PageEditorLinkAtHand | null>(null);
    const followPageHref = useCallback(
      (href: string): void => {
        const internalPage = resolveInternalPageHref(href);
        if (internalPage !== null && onNavigateToPage !== undefined) {
          onNavigateToPage(internalPage.spaceId, internalPage.pageId);
          return;
        }
        router.push(href);
      },
      [onNavigateToPage, router],
    );
    const goToRef = useRef(followPageHref);
    const [labels] = useState(() => buildPageEditorLabels(t, locale));
    const collectionSpotRef = useRef(0);
    const pagesRef = useRef(pages);
    const readPageTitleRef = useRef((childId: string): string | null => readPageTitleFrom(pagesRef.current, childId));
    const readPageIconRef = useRef((childId: string): PageIcon | null => readPageIconFrom(pagesRef.current, childId));
    const readPageLifecycleRef = useRef((childId: string): PageLifecycle | null =>
      readPageLifecycleFrom(pagesRef.current, childId),
    );
    const personOptionsRef = useRef(personOptions);
    const findPersonForHoverRef = useRef((userId: string): PagePersonOption | undefined =>
      personOptionsRef.current.find((option) => option.id === userId),
    );
    /** Avoids repeating the error until a change has been kept successfully. */
    const toldOfTooMuchRef = useRef(false);
    const [surface, setSurface] = useState<PageEditorSurfaceState>(PAGE_EDITOR_QUIET_SURFACE);
    const [usesCommandKey, setUsesCommandKey] = useState(false);

    const { participants, session, status } = usePagesCollaboration(pageId, canEdit, currentUserDisplayName ?? null);
    const liveSessionRef = useRef(session);

    useEffect(() => {
      liveSessionRef.current = session;
    }, [session]);
    const editorHostRef = useRef<HTMLDivElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    /** State rather than a ref: the live document must rebind to each rebuilt editor. */
    const [mountedEditorView, setMountedEditorView] = useState<EditorView | null>(null);
    const embedding = usePagesEditorCollectionEmbedding({
      editorViewRef,
      onInserted: () => router.refresh(),
      spaceId,
    });
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

    const readSurfaceRect = useCallback((): PageEditorSurfaceRect | null => {
      const surfaceElement = surfaceRef.current;
      if (surfaceElement === null) return null;
      const rect = surfaceElement.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width };
    }, []);

    // Destructured so the editor depends on the stable callback: a fresh object each render would rebuild it.
    const pastedLink = usePagesEditorPastedLink(editorViewRef, readSurfaceRect);
    const { handlePastedLink } = pastedLink;
    const preview = usePagesPreview(surfaceRef, readSurfaceRect);

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
    const blockActions = usePagesEditorBlockActions(editorViewRef, { pageId, spaceId });
    usePagesEditorBlockArrival(editorHostRef);
    usePagesEditorPageDrop({ editorViewRef, spaceId });
    const turnBlocksIntoPage = usePagesEditorBlocksToPage({ editorViewRef, spaceId });
    const find = usePagesEditorFind(editorViewRef);
    const syncFind = find.sync;
    const resumeFind = find.resume;

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
      canMakeAPage: pageId !== null,
      editorViewRef,
      onEscapeWithSelection: dismissSelectionToolbar,
      pagesAtHand: pages,
      spaceId,
      surfaceRef,
    });

    const triggerMenuId = useId();
    const isTriggerMenuOpen = canEdit && triggerQuery !== null && triggerMenuPosition !== null;
    const activeTriggerItemId = isTriggerMenuOpen ? (triggerItems[triggerSelectedIndex]?.id ?? null) : null;

    /** Focus stays in the editable text, so the editor exposes the menu state for assistive tech. */
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

    useEffect(() => {
      personOptionsRef.current = personOptions;
    }, [personOptions]);

    useEffect(() => {
      goToRef.current = followPageHref;
    }, [followPageHref]);

    /** The editor accepts more than a page can store (an over-long block), so the failure is reported, not silent. */
    const keepWhatCanBeKeptRef = useRef((state: EditorState): void => {
      const kept = readWhatThePageCanKeep(state);
      if (kept === null) {
        if (!toldOfTooMuchRef.current) toast.error(labels.blockTooLong);
        toldOfTooMuchRef.current = true;
        return;
      }
      toldOfTooMuchRef.current = false;
      contentCallbackRef.current(kept, liveSessionRef.current !== null);
    });

    useEffect(() => {
      setUsesCommandKey(usesCommandKeyboard(navigator.userAgent));
    }, []);

    useEffect(() => {
      const editorHost = editorHostRef.current;
      if (editorHost === null) return;

      const editorState = createPageEditorState(
        initialContentRef.current,
        labels.selectBlock,
        labels.insertBlock,
        labels.blockComments,
        labels.writeHere,
        labels.foldHeading,
        labels.resizeColumn,
      );
      const editorView = new EditorView(editorHost, {
        dispatchTransaction: (transaction) => {
          // Nothing is lost between teardown and rebinding: the live document keeps it and the new editor starts there.
          if (editorView.isDestroyed) return;
          const nextState = editorView.state.apply(transaction);
          editorView.updateState(nextState);
          syncFind(editorView);
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
          const next = readPageEditorSurface(editorView, nextState, readSurfaceRect());
          setSurface((previous) => keepPageEditorSurfaceIfSame(previous, next));
        },
        editable: () => !isPageEditorReadOnly(canEdit),
        handleDOMEvents: {
          // ProseMirror keeps the selection while unfocused, but the selection bar should not float over it.
          blur: (_view, event) => {
            const tookTheFocus = event.relatedTarget instanceof Element ? event.relatedTarget : null;
            setIsWritingInHand(isTheWritingStillInHand(tookTheFocus, surfaceRef.current));
            return false;
          },
          focus: () => {
            setIsWritingInHand(true);
            return false;
          },
          // Handled here, not at the clicked node, so a page mention is followed like a plain link.
          click: (_view, event) => {
            const followed = event.target instanceof Element ? event.target.closest('a') : null;
            const href = followed?.getAttribute('href') ?? null;
            if (href === null || !isWithinThePages(href)) return false;
            event.preventDefault();
            goToRef.current(href);
            return true;
          },
          mouseover: (view, event) => {
            const surfaceRect = readSurfaceRect();
            setLinkUnderPointer(surfaceRect === null ? null : readTheLinkUnderPointer(view, event.target, surfaceRect));
            return false;
          },
        },
        handleKeyDown: answerKeyPress,
        handlePaste: uploadPastedFile,
        nodeViews: createPageEditorNodeViews(
          labels.nodeViews,
          (childId) => readPageTitleRef.current(childId),
          (borrowedPageId, blockId) => readBorrowedBlock(pagesRef.current, borrowedPageId, blockId),
          (at) => pressTheButtonRef.current(at),
          (userId) => findPersonForHoverRef.current(userId),
          (mentionedPageId) => readPageIconRef.current(mentionedPageId),
          (mentionedPageId) => readPageLifecycleRef.current(mentionedPageId),
        ),
        state: editorState,
      });
      editorViewRef.current = editorView;
      setMountedEditorView(editorView);
      syncCollectionHosts();
      followHeadingsRef.current(editorView.state);

      return () => {
        editorView.destroy();
        editorViewRef.current = null;
      };
    }, [
      answerKeyPress,
      labels,
      canEdit,
      computeMenuPosition,
      readSurfaceRect,
      rememberTriggerMenuPosition,
      syncCollectionHosts,
      syncFind,
      updateEditorTrigger,
      uploadPastedFile,
    ]);

    usePagesEditorLiveBinding({
      editorViewRef,
      followHeadingsRef,
      keepWhatCanBeKeptRef,
      labels,
      mountedEditorView,
      resumeFind,
      session,
      syncFind,
    });

    const pressTheButtonRef = useRef((at: number): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      const pressed = readThePressedButton(editorView.state, at);
      if (pressed === null) return;
      if (pressed.content.childCount === 0) {
        toast.error(labels.buttonEmpty);
        return;
      }
      if (pressed.deed !== 'row') {
        createPageButtonWriteCommand(pressed)(editorView.state, editorView.dispatch);
        return;
      }
      if (pressed.pageId === null || pressed.spaceId === null) {
        toast.error(labels.nodeViews.button.needsCollection);
        return;
      }
      addTheRow(
        pressed.pageId,
        pressed.spaceId,
        readTheRowTitle(pressed.content, labels.untitled),
        readTheRowContent(pressed.content),
      );
    });

    const makeTheChildPage = (): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      if (pageId === null) {
        toast.error(t('subpageNeedsPage'));
        return;
      }
      // Captured before the async work, after which the selection has moved.
      const spot = editorView.state.selection.from;
      startMakingChild(async () => {
        const made = await callAction(() =>
          createPageAction({
            content: createEmptyPageContent(),
            parentId: pageId,
            spaceId,
            // Left empty rather than "Untitled", which would pass for a real name.
            title: '',
          }),
        );
        if (!isActionSuccess<PageSummary>(made)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(made)}`));
          return;
        }
        const insert = createPageSubpageInsertCommand(
          pageEditorSchema,
          { label: labels.nodeViews.subpage.untitled, pageId: made.data.id, spaceId },
          spot,
        );
        insert(editorView.state, editorView.dispatch);
        editorView.focus();
        router.refresh();
      });
    };

    const makeTheNamedPage = (title: string): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      if (pageId === null) {
        toast.error(t('subpageNeedsPage'));
        return;
      }
      // Captured before the async work, after which the selection has moved.
      const spot = editorView.state.selection.from;
      startMakingChild(async () => {
        const made = await callAction(() =>
          createPageAction({ content: createEmptyPageContent(), parentId: pageId, spaceId, title }),
        );
        if (!isActionSuccess<PageSummary>(made)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(made)}`));
          return;
        }
        const name = createPageMentionInsertAtCommand(
          pageEditorSchema,
          { label: made.data.title, pageId: made.data.id, spaceId },
          spot,
        );
        name(editorView.state, editorView.dispatch);
        editorView.focus();
        router.refresh();
      });
    };

    const makeTheCollection = (): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      if (pageId === null) {
        toast.error(t('collection.needsPage'));
        return;
      }
      embedding.create({
        parentId: pageId,
        shape: describeANewCollection(labels.collectionWording),
        spot: editorView.state.selection.from,
        title: labels.newCollectionTitle,
      });
    };

    /** Whether the page is a collection is only known by asking, so a failure is reported, not an empty block. */
    const showTheChosenCollection = (chosen: PageDestination): void => {
      setIsChoosingCollection(false);
      embedding.show(chosen.id, collectionSpotRef.current);
    };

    /** Switching back to a collection re-checks the page, since its shape may have been removed since. */
    const showThePageAs = (shape: PageEditorPageShape): void => {
      const editorView = editorViewRef.current;
      const target = surface.pageShape;
      if (editorView === null || target === null || target.chosen === shape) return;
      if (shape === 'link') {
        createPageShapeCommand(pageEditorSchema, shape, target, null)(editorView.state, editorView.dispatch);
        return;
      }
      startMakingChild(async () => {
        const asked = await callAction(() =>
          readPageCollectionAction({ pageId: target.pageId, spaceId: target.spaceId }),
        );
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

    /** The copy belongs to this page from then on; later edits on either side do not propagate. */
    const breakTheSync = (): void => {
      const editorView = editorViewRef.current;
      const target = surface.syncedTarget;
      if (editorView === null || target === null) return;
      const borrowed = readBorrowedBlock(pagesRef.current, target.pageId, target.blockId);
      createPageUnsyncCommand(pageEditorSchema, target, borrowed)(editorView.state, editorView.dispatch);
      editorView.focus();
    };

    /** Verified now so a button pointing at a non-collection fails here, not when someone presses it. */
    const chooseTheButtonCollection = (chosen: PageDestination): void => {
      const editorView = editorViewRef.current;
      const at = surface.buttonAt;
      if (editorView === null || at === null) return;
      blockActions.close('button');
      startMakingChild(async () => {
        const asked = await callAction(() => readPageCollectionAction({ pageId: chosen.id, spaceId }));
        if (!isActionSuccess<PageSchema | null>(asked)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(asked)}`));
          return;
        }
        if (asked.data === null || asked.data.properties.length === 0) {
          toast.error(t('collection.notACollection'));
          return;
        }
        createPageButtonCollectionCommand(at, chosen.id, spaceId)(editorView.state, editorView.dispatch);
      });
    };

    /** The schema is read first because required properties need default values, or an empty row would be refused. */
    const addTheRow = (collectionId: string, collectionSpaceId: string, title: string, content: PageContent): void => {
      startMakingChild(async () => {
        const asked = await callAction(() =>
          readPageCollectionAction({ pageId: collectionId, spaceId: collectionSpaceId }),
        );
        if (!isActionSuccess<PageSchema | null>(asked)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(asked)}`));
          return;
        }
        if (asked.data === null || asked.data.properties.length === 0) {
          toast.error(t('collection.notACollection'));
          return;
        }
        const schema = asked.data;
        const made = await callAction(() =>
          createPageAction({
            content,
            parentId: collectionId,
            propertyValues: buildRowPropertyValues(getEditableSchemaProperties(schema)),
            spaceId: collectionSpaceId,
            title,
          }),
        );
        if (!isActionSuccess<PageSummary>(made)) {
          toast.error(tErrors(`reasons.${readActionFailureReason(made)}`));
          return;
        }
        toast.success(t('buttonRowDone', { page: readPageTitleRef.current(collectionId) ?? title }));
        router.refresh();
      });
    };

    const askWhereTheLinkGoes = (): void => {
      const editorView = editorViewRef.current;
      const spot = surface.toolbarPosition;
      if (editorView === null || spot === null) return;
      const link = readTheLinkInHand(editorView.state);
      if (link === null) return;
      setLinkUnderPointer(null);
      setLinkInHand({ link, spot });
    };

    const stopBeingALink = (rested: PageEditorLinkAtHand): void => {
      const editorView = editorViewRef.current;
      setLinkUnderPointer(null);
      if (editorView === null) return;
      createPageLinkCommand(rested.link, null)(editorView.state, editorView.dispatch);
      editorView.focus();
    };

    const sayWhereTheLinkGoes = (href: string | null): void => {
      const editorView = editorViewRef.current;
      const asked = linkInHand;
      setLinkInHand(null);
      if (editorView === null || asked === null) return;
      createPageLinkCommand(asked.link, href)(editorView.state, editorView.dispatch);
      editorView.focus();
    };

    useImperativeHandle(
      handleRef,
      () => ({
        goToHeading: (position) => {
          const editorView = editorViewRef.current;
          if (editorView === null) return;
          goToThePageHeading(editorView, position);
        },
        goToWriting: () => {
          const editorView = editorViewRef.current;
          if (editorView === null) return;
          goToTheWritingStart(editorView);
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
          data-page-mention-request="true"
          disabled={isMakingChild}
          onClick={(event) => makeTheNamedPage(event.currentTarget.dataset[PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE] ?? '')}
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
        <button
          aria-hidden="true"
          className="hidden"
          data-page-link-request="true"
          onClick={askWhereTheLinkGoes}
          tabIndex={-1}
          type="button"
        />
        <button
          aria-hidden="true"
          className="hidden"
          data-page-find-request="true"
          onClick={find.open}
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
        <PagesEditorViewPickerDialog
          onCancel={embedding.cancel}
          onChoose={embedding.chooseView}
          views={embedding.choosableViews}
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
            className={cn(
              'w-full bg-surface py-4 leading-[1.6] outline-none',
              PAGE_APPEARANCE_TEXT_SIZE_STYLE_CLASSES[textSize],
              PAGE_APPEARANCE_TYPOGRAPHY_STYLE_CLASSES[typography],
            )}
            id="page-content"
            onDropCapture={uploadDroppedFile}
            ref={editorHostRef}
          />
          {collections.hosts.map(({ element, name, pageId: collectionPageId, viewName }) =>
            createPortal(
              embeddedCollections[readEmbeddedCollectionKey(collectionPageId, viewName)] ?? null,
              element,
              name,
            ),
          )}
          {find.isOpen && (
            <div className="absolute top-2 right-2 z-40 w-[min(20rem,calc(100%-1rem))]">
              <PagesEditorFindPanel
                currentIndex={find.found.currentIndex}
                onClose={find.close}
                onNext={find.goNext}
                onPrevious={find.goPrevious}
                onQueryChange={find.search}
                onReplace={find.replace}
                onReplaceAll={find.replaceAll}
                onReplacementChange={find.setReplacement}
                query={find.query}
                replacement={find.replacement}
                totalMatches={find.found.matches.length}
              />
            </div>
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
          {canEdit && (
            <PagesEditorLinkLayer
              asked={linkInHand}
              onCancel={() => {
                setLinkInHand(null);
                editorViewRef.current?.focus();
              }}
              onChoose={sayWhereTheLinkGoes}
              onEdit={(rested) => {
                setLinkUnderPointer(null);
                setLinkInHand(rested);
              }}
              onLeave={() => setLinkUnderPointer(null)}
              onRemove={stopBeingALink}
              pagesAtHand={pages}
              rested={linkUnderPointer}
            />
          )}
          <PagesPreviewLayer
            atHand={preview.atHand}
            onHold={preview.hold}
            onLetGo={preview.letGo}
            outcome={preview.outcome}
          />
          {/* Only one floating element at a time: a bar and a bubble over the same words overlap. */}
          {canEdit &&
            isWritingInHand &&
            linkInHand === null &&
            linkUnderPointer === null &&
            surface.toolbarPosition !== null && (
              <div
                className="absolute z-30"
                style={{ left: `${surface.toolbarPosition.left}px`, top: `${surface.toolbarPosition.top}px` }}
              >
                <PagesEditorToolbar
                  colors={surface.textColors}
                  commands={PAGE_EDITOR_COMMANDS}
                  conversions={surface.conversions}
                  marksInUse={surface.marksInUse}
                  onColor={(kind, color) => blockActions.runCommand(createPageTextColorCommand(kind, color))}
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
              buttonAt={surface.buttonAt}
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
              onChooseCollection={chooseTheButtonCollection}
              onClose={blockActions.close}
              onCopyLink={blockActions.copyLink}
              onHandOver={blockActions.handOver}
              onLinkShape={pastedLink.shapeLink}
              onPageShape={showThePageAs}
              onRunCommand={blockActions.runCommand}
              onSyncInto={blockActions.syncInto}
              onUnsync={breakTheSync}
              pageId={pageId}
              pageShape={surface.pageShape}
              request={surface.request}
              spaceId={spaceId}
              syncedTarget={surface.syncedTarget}
            />
          )}
        </div>
      </section>
    );
  },
);
PagesProseMirrorEditor.displayName = 'PagesProseMirrorEditor';
