'use client';

import { EditorView } from 'prosemirror-view';
import { useEffect, useRef } from 'react';
import { PAGE_EDITOR_COMMANDS } from '../constants/pages.editor.constants';
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
  readonly onContentChange: (content: PageContent) => void;
}

export const PagesProseMirrorEditor = ({ canEdit, content, onContentChange }: IProps) => {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const contentCallbackRef = useRef(onContentChange);

  useEffect(() => {
    contentCallbackRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    const editorHost = editorHostRef.current;
    if (editorHost === null) return;

    const editorState = createPageEditorState(content);
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
  }, [canEdit, content]);

  return (
    <section aria-label="Editor de contenido" className="space-y-3">
      {canEdit && (
        <div aria-label="Herramientas de formato" className="flex flex-wrap gap-2" role="toolbar">
          {Object.entries(PAGE_EDITOR_COMMANDS).map(([commandName, command]) => (
            <button
              aria-label={command.label}
              className="min-h-10 border border-border bg-background px-3 text-foreground text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              key={commandName}
              onMouseDown={(event) => {
                event.preventDefault();
                if (editorViewRef.current !== null) runPageEditorCommand(editorViewRef.current, command);
              }}
              type="button"
            >
              {command.label}
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
};
