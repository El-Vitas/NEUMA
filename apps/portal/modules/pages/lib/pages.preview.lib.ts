import {
  extractPageContentSegments,
  isPagePropertyValueEmpty,
  joinPageContentSegmentsForSearch,
} from '@company-brain/shared';
import { PAGE_PROPERTIES_VISIBLE_LIMIT } from '../constants/pages.constants';
import {
  PAGE_PREVIEW_CARD_ATTRIBUTE,
  PAGE_PREVIEW_FRAGMENT_LIMIT,
  PAGE_PREVIEW_GAP_PX,
  PAGE_PREVIEW_INTERNAL_HREF,
  PAGE_PREVIEW_LEADING_ICON,
  PAGE_PREVIEW_NEW_PAGE_SEGMENT,
  PAGE_PREVIEW_WHITESPACE,
} from '../constants/pages.preview.constants';
import type { PageEditorSpot, PageEditorSurfaceRect } from '../types/pages.editor.surface.types';
import type { PagePreviewLinkMatch, PagePreviewProperty, PagePreviewTarget } from '../types/pages.preview.types';
import type { PagePropertyValues, PageSchema } from '../types/pages.schema.types';
import type { PageContent } from '../types/pages.types';
import { formatPropertyValueForDisplay, getEditableSchemaProperties } from './pages.properties.lib';

/** Which page a link names, read from the one shape a link to this app's own pages takes. */
export const readInternalPageTarget = (href: string): PagePreviewTarget | null => {
  const matched = PAGE_PREVIEW_INTERNAL_HREF.exec(href);
  const spaceId = matched?.[1];
  const pageId = matched?.[2];
  if (spaceId === undefined || pageId === undefined || pageId === PAGE_PREVIEW_NEW_PAGE_SEGMENT) return null;
  return { pageId, spaceId };
};

/** The mark a title wears at its own front, if it wears one — nothing is invented for a title that does not. */
export const readPagePreviewIcon = (title: string): string | null => PAGE_PREVIEW_LEADING_ICON.exec(title)?.[0] ?? null;

/** What a title is called once the mark at its front is set apart from it. */
export const readPagePreviewTitle = (title: string): string => {
  const icon = readPagePreviewIcon(title);
  return (icon === null ? title : title.slice(icon.length)).trim();
};

/** What a page holds, said in as few words as fit in a glance rather than the whole of it. */
export const readPagePreviewFragment = (content: PageContent): string =>
  joinPageContentSegmentsForSearch(extractPageContentSegments(content))
    .replace(PAGE_PREVIEW_WHITESPACE, ' ')
    .trim()
    .slice(0, PAGE_PREVIEW_FRAGMENT_LIMIT);

/**
 * The properties a page carries, worth showing at a glance: those a person
 * filled in, named the way the schema they belong to names them.
 *
 * The schema is asked of the page's own parent, since it is the parent — the
 * collection a page is a row of — that says what a row's properties mean; a
 * page with no parent, or whose parent could not be read, carries none.
 */
export const readPagePreviewProperties = (
  schema: PageSchema | null,
  values: PagePropertyValues | null,
): readonly PagePreviewProperty[] => {
  if (schema === null || values === null) return [];
  return getEditableSchemaProperties(schema)
    .map((property) => ({ property, value: values[property.key] }))
    .filter(({ property, value }) => value !== undefined && !isPagePropertyValueEmpty(property.type, value))
    .slice(0, PAGE_PROPERTIES_VISIBLE_LIMIT)
    .map(({ property, value }) => ({
      key: property.key,
      label: property.label,
      value: formatPropertyValueForDisplay(property, value),
    }));
};

/**
 * Which link the pointer or the keyboard is on, and the page it names, if it
 * names one of this app's own — found without measuring anything, so passing
 * over plain writing never forces a layout read.
 */
export const readPagePreviewLink = (container: Element, target: EventTarget | null): PagePreviewLinkMatch | null => {
  const anchor = target instanceof Element ? target.closest('a') : null;
  if (anchor === null || !container.contains(anchor)) return null;
  const href = anchor.getAttribute('href');
  const pageTarget = href === null ? null : readInternalPageTarget(href);
  return pageTarget === null ? null : { anchor, target: pageTarget };
};

/**
 * Where a link's own preview should stand — past the gap a link's own tools
 * already stand in, so the two never cover each other. Asked only once a
 * link has already been found, since this is the part that measures.
 */
export const readPagePreviewSpot = (anchor: Element, surfaceRect: PageEditorSurfaceRect): PageEditorSpot => {
  const rect = anchor.getBoundingClientRect();
  return { left: rect.left - surfaceRect.left, top: rect.bottom - surfaceRect.top + PAGE_PREVIEW_GAP_PX };
};

/** Whether the pointer is on the preview itself, so reaching for it is not read as leaving the link it opened for. */
export const isWithinThePagePreviewCard = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(`[${PAGE_PREVIEW_CARD_ATTRIBUTE}]`) !== null;
