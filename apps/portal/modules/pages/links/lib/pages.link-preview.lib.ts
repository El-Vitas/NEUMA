import {
  PAGE_LINK_PREVIEW_CONTENT,
  PAGE_LINK_PREVIEW_HREF,
  PAGE_LINK_PREVIEW_ICON_REL,
  PAGE_LINK_PREVIEW_TAG_LIMIT,
  PAGE_LINK_PREVIEW_TEXT_LIMIT,
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

const isEndOfTagName = (character: string | undefined): boolean =>
  character === undefined || character === '>' || character === '/' || character.trim() === '';

const isTagNamed = (html: string, start: number, name: string): boolean => {
  const nameEnd = start + 1 + name.length;
  return html.slice(start + 1, nameEnd).toLowerCase() === name && isEndOfTagName(html[nameEnd]);
};

/**
 * Walks the tags of one name with indexOf only: remote pages are hostile, and a pattern that restarts
 * at every `<` goes quadratic on a run of unclosed tags. The next `>` is searched once per run.
 */
const readFirstFromTags = (
  html: string,
  name: string,
  pick: (tag: string) => string | undefined,
): string | undefined => {
  let cursor = 0;
  let nextClose = -1;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor);
    if (start === -1) return undefined;
    cursor = start + 1;
    if (!isTagNamed(html, start, name)) continue;
    if (nextClose < start) nextClose = html.indexOf('>', start);
    if (nextClose === -1) return undefined;
    if (nextClose - start > PAGE_LINK_PREVIEW_TAG_LIMIT) continue;
    const found = pick(html.slice(start, nextClose + 1));
    if (found !== undefined) return found;
  }
};

const readMeta = (html: string, name: string): string | undefined =>
  readFirstFromTags(html, 'meta', (tag) => {
    const isNamed = tag.includes(`="${name}"`) || tag.includes(`='${name}'`);
    return isNamed ? readText(PAGE_LINK_PREVIEW_CONTENT.exec(tag)?.[1]) : undefined;
  });

const findTitleEnd = (html: string, from: number): number => {
  let cursor = from;
  while (cursor < html.length) {
    const start = html.indexOf('</', cursor);
    if (start === -1) return -1;
    if (isTagNamed(html, start + 1, 'title')) return start;
    cursor = start + 2;
  }
  return -1;
};

const readTitleTag = (html: string): string | undefined => {
  const open = readFirstFromTags(html, 'title', (tag) => tag);
  if (open === undefined) return undefined;
  const contentStart = html.indexOf(open) + open.length;
  const contentEnd = findTitleEnd(html, contentStart);
  return contentEnd === -1 ? undefined : readText(html.slice(contentStart, contentEnd));
};

const readIcon = (html: string, url: string): string | undefined =>
  readFirstFromTags(html, 'link', (tag) => {
    if (!PAGE_LINK_PREVIEW_ICON_REL.test(tag)) return;
    const href = readText(PAGE_LINK_PREVIEW_HREF.exec(tag)?.[1]);
    if (href === undefined || !URL.canParse(href, url)) return;
    const mark = new URL(href, url);
    return mark.protocol === 'https:' || mark.protocol === 'http:' ? mark.toString() : undefined;
  });

/**
 * Prefers the share title over the tab title. Only title and icon are read: descriptions served to
 * anonymous requests are often unrelated (YouTube returns an arbitrary video's).
 */
export const readLinkPreviewFromHtml = (html: string, url: string): PageLinkPreview => {
  const title = readMeta(html, 'og:title') ?? readTitleTag(html);
  const icon = readIcon(html, url);

  return {
    ...(icon === undefined ? {} : { icon }),
    ...(title === undefined ? {} : { title }),
    url,
  };
};
