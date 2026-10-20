/** Which blocks declare their own access, and the words that say so to someone who cannot see the icon. */
export interface PageEditorRestrictedBlocks {
  readonly ids: ReadonlySet<string>;
  readonly label: string;
}
