/** What a document says about itself at the top of its own file. */
export interface DocsFrontMatter {
  readonly order: number;
  readonly summary: string;
  readonly title: string;
}

/** A document as it is listed: what it is called, what it answers, and where it lives. */
export interface DocsEntry extends DocsFrontMatter {
  readonly slug: string;
}

/** A document as it is read: what it says about itself, and everything it says. */
export interface DocsDocument extends DocsEntry {
  readonly markdown: string;
}

/** A heading somebody can jump straight to. */
export interface DocsHeading {
  readonly depth: number;
  readonly id: string;
  readonly title: string;
}

/** A picture a document names: the book, the picture, and how it was written. */
export interface DocsNamedIcon {
  readonly book: string;
  readonly name: string;
  readonly said: string;
}

/** How a picture is drawn, and the square it is drawn inside. */
export interface DocsIconDrawing {
  readonly body: string;
  readonly height: number;
  readonly width: number;
}
