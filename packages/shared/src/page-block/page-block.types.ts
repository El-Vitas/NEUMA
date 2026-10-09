/** Projected to `PageBlock` and to search. */
export interface PageBlockEntry {
  /** Enclosing headings, outermost first. */
  readonly headingPath: readonly string[];
  readonly id: string;
  /** Nearest enclosing block with an id; null at the page root. */
  readonly parentId: string | null;
  /** Zero-based reading order. */
  readonly position: number;
  /** The block's own text, excluding nested blocks. */
  readonly text: string;
  readonly type: string;
}
