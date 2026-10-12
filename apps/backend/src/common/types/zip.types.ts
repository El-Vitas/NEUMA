export interface PreparedZipEntry {
  readonly checksum: number;
  readonly compressed: Uint8Array<ArrayBuffer>;
  readonly name: Uint8Array<ArrayBuffer>;
  readonly originalLength: number;
}

export interface ZipEntry {
  readonly contents: string | Uint8Array;
  /** Path inside the archive, folders included: `Parent/Child.md`. */
  readonly path: string;
}
