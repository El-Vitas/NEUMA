/** What a page says about itself, as far as it could be read. */
export interface PageLinkPreview {
  readonly description?: string;
  readonly icon?: string;
  readonly title?: string;
  readonly url: string;
}
