/** The formula written here. Empty means one not written yet. */
export interface PageFormulaInsert {
  readonly latex: string;
}

/** What an attempt to draw a formula came back with: the markup katex drew, or the writing it refused. */
export type PageFormulaDrawing = { readonly html: string } | { readonly text: string };
