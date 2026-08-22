/** An emoji the finder can offer: the character itself, and every name it answers to. */
export interface PageEmojiEntry {
  readonly character: string;
  readonly names: readonly string[];
}
