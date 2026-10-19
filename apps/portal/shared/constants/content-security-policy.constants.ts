/** The players the editor's embed block renders (`PAGE_EMBED_PROVIDERS` in `@neuma/shared`). */
export const EMBED_FRAME_ORIGINS = [
  'https://www.figma.com',
  'https://www.loom.com',
  'https://player.vimeo.com',
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
] as const;

export const FRAME_ANCESTORS_NONE = "'none'";
export const FRAME_ANCESTORS_SAME_ORIGIN = "'self'";
