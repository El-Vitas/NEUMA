export interface DocsFrontMatter {
  readonly order: number;
  readonly summary: string;
  readonly title: string;
}

export interface DocsEntry extends DocsFrontMatter {
  readonly slug: string;
}

export interface DocsDocument extends DocsEntry {
  readonly markdown: string;
}

export interface DocsHeading {
  readonly depth: number;
  readonly id: string;
  readonly title: string;
}

export interface DocsNamedIcon {
  readonly book: string;
  readonly name: string;
  readonly said: string;
}

export interface DocsIconDrawing {
  readonly body: string;
  readonly height: number;
  readonly width: number;
}
