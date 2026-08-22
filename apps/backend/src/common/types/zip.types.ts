/** One entry as the archive keeps it: what it is called, what it holds, and what proves it arrived whole. */
export interface PreparedZipEntry {
  readonly checksum: number;
  readonly compressed: Uint8Array<ArrayBuffer>;
  readonly name: Uint8Array<ArrayBuffer>;
  readonly originalLength: number;
}

export interface ZipEntry {
  readonly contents: string;
  /** Where it sits inside the archive, folders and all: `Madre/Hija.md`. */
  readonly path: string;
}
