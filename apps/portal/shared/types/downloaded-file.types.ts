/** A file the backend hands over whole: what it is, and the bytes of it, encoded so an action can return them. */
export interface DownloadedFile {
  readonly base64: string;
  readonly mediaType: string;
}
