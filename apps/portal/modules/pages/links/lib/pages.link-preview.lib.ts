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
    /** The name has to be what the tag is *for*, not something written inside it. */
    if (!tag.includes(`="${name}"`) && !tag.includes(`='${name}'`)) continue;
    const content = PAGE_LINK_PREVIEW_CONTENT.exec(tag)?.[1];
    const said = readText(content);
    if (said !== undefined) return said;
  }
  return;
};

const readIcon = (html: string, url: string): string | undefined => {
  for (const match of html.matchAll(PAGE_LINK_PREVIEW_ICON_LINK)) {
    const tag = match[0];
    if (!PAGE_LINK_PREVIEW_ICON_REL.test(tag)) continue;
    const href = readText(PAGE_LINK_PREVIEW_HREF.exec(tag)?.[1]);
    if (href === undefined) continue;
    if (!URL.canParse(href, url)) continue;
    /** A mark drawn into the address itself is not an address, and a card cannot keep it. */
    const mark = new URL(href, url);
    if (mark.protocol !== 'https:' && mark.protocol !== 'http:') continue;
    return mark.toString();
  }
  return;
};

/**
 * What a page says about itself, read from what it sent.
 *
 * What a site wrote for whoever shares it is preferred over the title of the
 * tab, because that is the sentence it chose to be quoted by. Nothing is
 * invented: a page that says nothing about itself is kept as its own address,
 * which is the truest thing there is to say about it.
 *
 * Only its name and its mark are taken. What a page says *about* itself to a
 * stranger is often about something else entirely — YouTube hands anyone who
 * asks without a session the description of a video nobody asked for — and a
 * card that quotes the wrong thing is worse than one that quotes nothing.
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
