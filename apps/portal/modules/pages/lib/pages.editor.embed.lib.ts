import { isAllowedPageEmbedUrl, PAGE_EMBED_PROVIDERS, type PageEmbedProvider } from '@company-brain/shared';
import {
  PAGE_EDITOR_EMBED_FIGMA_HOST,
  PAGE_EDITOR_EMBED_LOOM_SHARE,
  PAGE_EDITOR_EMBED_VIMEO_VIDEO,
  PAGE_EDITOR_EMBED_YOUTUBE_SHORT_HOST,
  PAGE_EDITOR_EMBED_YOUTUBE_VIDEO,
} from '../constants/pages.editor.blocks.constants';

/**
 * Which of the services a page can show a link belongs to.
 *
 * A link to anywhere else is not refused here — it is simply not one of these,
 * and the page has other ways to hold it.
 */
export const readPageEmbedProvider = (url: string): PageEmbedProvider | null =>
  PAGE_EMBED_PROVIDERS.find((provider) => isAllowedPageEmbedUrl(provider, url)) ?? null;

const readYouTubeFrame = (url: URL): string | null => {
  const shared =
    url.hostname === PAGE_EDITOR_EMBED_YOUTUBE_SHORT_HOST ? url.pathname.slice(1) : url.searchParams.get('v');
  const already = PAGE_EDITOR_EMBED_YOUTUBE_VIDEO.exec(url.pathname)?.[1] ?? null;
  const video = shared === null || shared === '' ? already : shared;
  return video === null || video === '' ? null : `https://www.youtube.com/embed/${video}`;
};

const readVimeoFrame = (url: URL): string | null => {
  const video = PAGE_EDITOR_EMBED_VIMEO_VIDEO.exec(url.pathname)?.[1] ?? null;
  return video === null ? null : `https://player.vimeo.com/video/${video}`;
};

const readLoomFrame = (url: URL): string | null => {
  const recording = PAGE_EDITOR_EMBED_LOOM_SHARE.exec(url.pathname)?.[2] ?? null;
  return recording === null || recording === '' ? null : `https://www.loom.com/embed/${recording}`;
};

/**
 * The address the service itself shows the thing at, which is not the address
 * it is shared at: a video shared as `watch?v=…` is played at `embed/…`, and
 * handing the shared one to a frame shows a page, not a video.
 *
 * A drawing is the exception: the service is handed the whole address and
 * decides what to draw.
 */
export const readPageEmbedFrameUrl = (provider: PageEmbedProvider, value: string): string | null => {
  if (!isAllowedPageEmbedUrl(provider, value)) return null;
  const url = new URL(value);
  switch (provider) {
    case 'figma':
      return `${PAGE_EDITOR_EMBED_FIGMA_HOST}${encodeURIComponent(value)}`;
    case 'loom':
      return readLoomFrame(url);
    case 'vimeo':
      return readVimeoFrame(url);
    default:
      return readYouTubeFrame(url);
  }
};
