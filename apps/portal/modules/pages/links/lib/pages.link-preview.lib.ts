import {
  PAGE_LINK_PREVIEW_CONTENT,
  PAGE_LINK_PREVIEW_HREF,
  PAGE_LINK_PREVIEW_ICON_LINK,
  PAGE_LINK_PREVIEW_ICON_REL,
  PAGE_LINK_PREVIEW_META,
  PAGE_LINK_PREVIEW_TEXT_LIMIT,
  PAGE_LINK_PREVIEW_TITLE,
} from '../constants/pages.link-preview.constants';
import type { PageLinkPreview } from '../types/pages.link-preview.types';

const unescapeHtml = (value: string): string =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

const readText = (value: string | undefined): string | undefined => {
  const said = value === undefined ? '' : unescapeHtml(value).trim();
  return said.length === 0 ? undefined : said.slice(0, PAGE_LINK_PREVIEW_TEXT_LIMIT);
};

const readMeta = (html: string, name: string): string | undefined => {
  for (const match of html.matchAll(PAGE_LINK_PREVIEW_META)) {
    const tag = match[0];
    if (!tag.includes(`="${name}"`) && !tag.includes(`='${name}'`)) continue;
    const content = PAGE_LINK_PREVIEW_CONTENT.exec(tag)?.[1];
    const said = readText(content);
    if (said !== undefined) return said;
  }
};

const readIcon = (html: string, url: string): string | undefined => {
  for (const match of html.matchAll(PAGE_LINK_PREVIEW_ICON_LINK)) {
    const tag = match[0];
    if (!PAGE_LINK_PREVIEW_ICON_REL.test(tag)) continue;
    const href = readText(PAGE_LINK_PREVIEW_HREF.exec(tag)?.[1]);
    if (href === undefined) continue;
    if (!URL.canParse(href, url)) continue;
    const mark = new URL(href, url);
    if (mark.protocol !== 'https:' && mark.protocol !== 'http:') continue;
    return mark.toString();
  }
};

/**
 * Prefers the share title over the tab title. Only title and icon are read: descriptions served to
 * anonymous requests are often unrelated (YouTube returns an arbitrary video's).
 */
export const readLinkPreviewFromHtml = (html: string, url: string): PageLinkPreview => {
  const title = readMeta(html, 'og:title') ?? readText(PAGE_LINK_PREVIEW_TITLE.exec(html)?.[1]);
  const icon = readIcon(html, url);

  return {
    ...(icon === undefined ? {} : { icon }),
    ...(title === undefined ? {} : { title }),
    url,
  };
};
