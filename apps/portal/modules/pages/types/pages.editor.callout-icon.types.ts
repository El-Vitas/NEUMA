/**
 * The mark of the callout a menu was opened for.
 *
 * It is absent for every other kind of block, which is how the menu knows not
 * to offer a choice that would mean nothing there.
 */
export interface PageEditorCalloutIconChoice {
  readonly chosen: string | null;
}
