/** The frame a block is stretched by, and the two things its node view still has to do with it. */
export interface PageEditorWidthFrame {
  readonly frame: HTMLElement;
  readonly handle: HTMLElement;
  readonly showWidth: (width: unknown) => void;
}
