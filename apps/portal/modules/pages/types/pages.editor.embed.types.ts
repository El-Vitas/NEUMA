/** What is said about something another service holds, and about a link nothing can be shown of. */
export interface PageEditorEmbedLabels {
  readonly providers: Readonly<Record<string, string>>;
  readonly refused: string;
  readonly resize: string;
}
