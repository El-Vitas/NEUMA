import {
  extractPageContentSegments,
  isPagePropertyValueEmpty,
  joinPageContentSegmentsForSearch,
} from '@company-brain/shared';
import { formatPropertyValueForDisplay, getEditableSchemaProperties } from '../../collections/lib/pages.properties.lib';
import type { PagePropertyValues, PageSchema } from '../../collections/types/pages.schema.types';
import { PAGE_PROPERTIES_VISIBLE_LIMIT } from '../../constants/pages.constants';
import type { PageEditorSpot, PageEditorSurfaceRect } from '../../editor/menus/types/pages.editor.surface.types';
import type { PageContent } from '../../types/pages.types';
import {
  PAGE_PREVIEW_CARD_ATTRIBUTE,
  PAGE_PREVIEW_FRAGMENT_LIMIT,
  PAGE_PREVIEW_INTERNAL_HREF,
  PAGE_PREVIEW_LEADING_ICON,
  PAGE_PREVIEW_NEW_PAGE_SEGMENT,
  PAGE_PREVIEW_WHITESPACE,
} from '../constants/pages.preview.constants';
import type { PagePreviewLinkMatch, PagePreviewProperty, PagePreviewTarget } from '../types/pages.preview.types';

export const readInternalPageTarget = (href: string): PagePreviewTarget | null => {
  const matched = PAGE_PREVIEW_INTERNAL_HREF.exec(href);
  const spaceId = matched?.[1];
  const pageId = matched?.[2];
  if (spaceId === undefined || pageId === undefined || pageId === PAGE_PREVIEW_NEW_PAGE_SEGMENT) return null;
  return { pageId, spaceId };
};

export const readPagePreviewIcon = (title: string): string | null => PAGE_PREVIEW_LEADING_ICON.exec(title)?.[0] ?? null;

export const readPagePreviewTitle = (title: string): string => {
  const icon = readPagePreviewIcon(title);
  return (icon === null ? title : title.slice(icon.length)).trim();
};

export const readPagePreviewFragment = (content: PageContent): string =>
  joinPageContentSegmentsForSearch(extractPageContentSegments(content))
    .replace(PAGE_PREVIEW_WHITESPACE, ' ')
    .trim()
    .slice(0, PAGE_PREVIEW_FRAGMENT_LIMIT);

/** The schema comes from the parent collection; a page without a readable parent has no properties. */
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

export const isWithinThePagePreviewCard = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(`[${PAGE_PREVIEW_CARD_ATTRIBUTE}]`) !== null;

export const readPagePreviewLink = (container: Element, target: EventTarget | null): PagePreviewLinkMatch | null => {
  const anchor = target instanceof Element ? target.closest('a') : null;
  if (anchor === null || !container.contains(anchor)) return null;
  /** The card's own link points at the page already shown, so it is not a new preview target. */
  if (isWithinThePagePreviewCard(anchor)) return null;
  const href = anchor.getAttribute('href');
  const pageTarget = href === null ? null : readInternalPageTarget(href);
  return pageTarget === null ? null : { anchor, target: pageTarget };
};

/** Starts right under the link; the card pads itself down so the gap belongs to the card. */
export const readPagePreviewSpot = (anchor: Element, surfaceRect: PageEditorSurfaceRect): PageEditorSpot => {
  const rect = anchor.getBoundingClientRect();
  return { left: rect.left - surfaceRect.left, top: rect.bottom - surfaceRect.top };
};
