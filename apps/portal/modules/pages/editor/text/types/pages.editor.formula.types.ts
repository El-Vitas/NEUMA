/** An empty `latex` is a formula not written yet. */
export interface PageFormulaInsert {
  readonly latex: string;
}

export type PageFormulaDrawing = { readonly html: string } | { readonly text: string };
