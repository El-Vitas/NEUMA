import type { PageFormulaSaveError } from '@neuma/shared';

export type FormulaCheck =
  | { readonly isValid: false; readonly problem: PageFormulaSaveError }
  | { readonly isValid: true; readonly resultType: string };
