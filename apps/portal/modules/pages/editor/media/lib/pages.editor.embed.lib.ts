import { isAllowedPageEmbedUrl, PAGE_EMBED_PROVIDERS, type PageEmbedProvider } from '@neuma/shared';
import {
  PAGE_EDITOR_EMBED_FIGMA_FRAME,
  PAGE_EDITOR_EMBED_FIGMA_HOST,
  PAGE_EDITOR_EMBED_LOOM_SHARE,
  PAGE_EDITOR_EMBED_VIMEO_VIDEO,
  PAGE_EDITOR_EMBED_YOUTUBE_SHORT_HOST,
  PAGE_EDITOR_EMBED_YOUTUBE_VIDEO,
} from '../../blocks/constants/pages.editor.blocks.constants';

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
 * Maps the shared URL to the provider's embed URL (`watch?v=…` becomes `embed/…`), since framing the shared
 * one shows a page, not the video. Drawing providers receive the whole URL.
 */
export const readPageEmbedFrameUrl = (provider: PageEmbedProvider, value: string): string | null => {
  if (!isAllowedPageEmbedUrl(provider, value)) return null;
  const url = new URL(value);
  switch (provider) {
    case 'figma':
      return `${PAGE_EDITOR_EMBED_FIGMA_FRAME}?embed_host=${PAGE_EDITOR_EMBED_FIGMA_HOST}&url=${encodeURIComponent(value)}`;
    case 'loom':
      return readLoomFrame(url);
    case 'vimeo':
      return readVimeoFrame(url);
    default:
      return readYouTubeFrame(url);
  }
};
