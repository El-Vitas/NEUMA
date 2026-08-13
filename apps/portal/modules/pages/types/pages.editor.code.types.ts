/** What the controls of a code block are called, since none of them is a stretch of text to read. */
export interface PageEditorCodeLabels {
  readonly copy: string;
  readonly language: string;
  readonly languages: Readonly<Record<string, string>>;
  readonly wrap: string;
}
