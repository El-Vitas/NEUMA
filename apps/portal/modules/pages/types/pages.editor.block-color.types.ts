/** The two things a colour can be applied to on a block: what it says, and what it sits on. */
export type PageEditorBlockColorKind = 'background' | 'text';

/** The colours a block is wearing right now. */
export interface PageEditorBlockColors {
  readonly background: string | null;
  readonly text: string | null;
}
