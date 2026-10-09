import type { PageEditorDiagramLabels } from '../../media/types/pages.editor.diagram.types';

/** What the controls of a code block are called, since none of them is a stretch of text to read. */
export interface PageEditorCodeLabels {
  readonly copied: string;
  readonly copy: string;
  readonly copyFailed: string;
  readonly diagram: PageEditorDiagramLabels;
  readonly language: string;
  readonly languages: Readonly<Record<string, string>>;
  readonly wrap: string;
}
