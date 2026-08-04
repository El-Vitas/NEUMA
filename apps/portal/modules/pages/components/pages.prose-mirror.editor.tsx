'use client';

import { useTranslations } from 'next-intl';
import type { Command } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { type ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PAGE_EDITOR_COMMANDS } from '../constants/pages.editor.constants';
import { usePagesCollaboration } from '../hooks/use.pages.collaboration';
import { createCollaborativePageEditorState, getCollaborationStatusLabelKey } from '../lib/pages.collaboration.lib';
import {
  createPageEditorState,
  isPageEditorReadOnly,
  runPageEditorCommand,
  serializePageEditorState,
} from '../lib/pages.editor.lib';
import type { PageContent } from '../types/pages.types';

interface IProps {
  readonly canEdit: boolean;
  readonly content: PageContent;
  readonly currentUserDisplayName?: string;
  readonly onContentChange: (content: PageContent) => void;
  readonly pageId: string | null;
}

export const PagesProseMirrorEditor = forwardRef(
  (
    { canEdit, content, currentUserDisplayName, onContentChange, pageId }: IProps,
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
    const editorViewRef = useRef<EditorView | null>(null);
    const contentCallbackRef = useRef(onContentChange);
    const initialContentRef = useRef(content);

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
        },
        editable: () => !isPageEditorReadOnly(canEdit),
        state: editorState,
      });
      editorViewRef.current = editorView;

      return () => {
        editorView.destroy();
        editorViewRef.current = null;
      };
    }, [canEdit]);

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

    const showsFallbackNotice = status === 'error' || status === 'disconnected' || status === 'exhausted';

    return (
      <section aria-label={t('editor')} className="space-y-3">
        {pageId !== null && canEdit && status !== null && (
          <p aria-live="polite" className="text-muted-foreground text-xs">
            {t(getCollaborationStatusLabelKey(status))}
            {showsFallbackNotice && ` ${t('collaboration.fallback')}`}
          </p>
        )}
        {pageId !== null && canEdit && participants.length > 0 && (
          <ul aria-label={t('collaboration.participants')} className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <li
                className="flex items-center gap-1.5 border border-border bg-background px-2 py-1 text-foreground text-xs"
                key={participant.clientId}
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: participant.color ?? undefined }}
                />
                <span>{participant.name.length > 0 ? participant.name : t('collaboration.participantFallback')}</span>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div aria-label={t('formattingTools')} className="flex flex-wrap gap-2" role="toolbar">
            {Object.entries(PAGE_EDITOR_COMMANDS).map(([commandName, command]) => (
              <button
                aria-label={t(`commands.${command.labelKey}`)}
                className="min-h-10 border border-border bg-background px-3 text-foreground text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                key={commandName}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (editorViewRef.current !== null) runPageEditorCommand(editorViewRef.current, command);
                }}
                type="button"
              >
                {t(`commands.${command.labelKey}`)}
              </button>
            ))}
          </div>
        )}
        <div
          className="min-h-48 w-full border border-border bg-background p-3 text-sm outline-none focus-within:ring-2 focus-within:ring-ring"
          id="page-content"
          ref={editorHostRef}
        />
      </section>
    );
  },
);
PagesProseMirrorEditor.displayName = 'PagesProseMirrorEditor';
