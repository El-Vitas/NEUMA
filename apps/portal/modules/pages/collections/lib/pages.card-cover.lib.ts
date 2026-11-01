import type { PageCardSize } from '@neuma/shared';
import { PAGE_CARD_SIZE, PAGE_CARD_SIZE_VALUES } from '@neuma/shared';
import {
  PAGE_CARD_COVER_HEIGHT_CLASSES,
  PAGE_CARD_COVER_IMAGE_MIME_PREFIX,
  PAGE_CARD_GRID_CLASSES,
} from '../constants/pages.card.constants';
import type { PageAttachedFile, PageRow } from '../types/pages.schema.types';
import { getListPropertyValue } from './pages.properties.lib';

/**
 * The first image in the files property the view names, in the order the cell lists them. A file the server did not
 * send, or that is not an image, is skipped: a cover that does not load would leave a hole in the card.
 */
export const readCardCoverFileId = (
  row: PageRow,
  coverProperty: null | string,
  attachedFiles: readonly PageAttachedFile[],
): null | string => {
  if (coverProperty === null) return null;
  const fileIds = getListPropertyValue(row.propertyValues?.[coverProperty]);
  const cover = fileIds.find((fileId) =>
    attachedFiles.some((file) => file.id === fileId && file.mimeType.startsWith(PAGE_CARD_COVER_IMAGE_MIME_PREFIX)),
  );
  return cover ?? null;
};

export const readCardSizeColumns = (size: PageCardSize): string => PAGE_CARD_GRID_CLASSES[size];

/** Narrows a select's plain string by lookup instead of a cast. */
export const readCardSize = (chosen: string): PageCardSize =>
  PAGE_CARD_SIZE_VALUES.find((candidate) => candidate === chosen) ?? PAGE_CARD_SIZE.MEDIUM;

export const readCardCoverHeight = (size: PageCardSize): string => PAGE_CARD_COVER_HEIGHT_CLASSES[size];
