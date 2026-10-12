import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type { PageCollaborationSession } from '../../types/pages.collaboration.types';
import type { PageEditorLabels } from './pages.editor.labels.types';

export interface PagesEditorLiveBindingOptions {
  readonly editorViewRef: RefObject<EditorView | null>;
  readonly followHeadingsRef: RefObject<(state: EditorState) => void>;
  readonly keepWhatCanBeKeptRef: RefObject<(state: EditorState) => void>;
  readonly labels: PageEditorLabels;
  readonly mountedEditorView: EditorView | null;
  readonly resumeFind: (view: EditorView) => void;
  readonly session: PageCollaborationSession | null;
  readonly syncFind: (view: EditorView) => void;
}
