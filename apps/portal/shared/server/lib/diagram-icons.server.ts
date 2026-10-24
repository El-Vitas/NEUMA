import 'server-only';
import type { IconifyJSON } from '@iconify/types';
import { icons as brandIcons } from '@iconify-json/logos';
import { icons as materialIcons } from '@iconify-json/mdi';
import { DIAGRAM_BRAND_ICONS_NAME, DIAGRAM_MATERIAL_ICONS_NAME } from '@/shared/constants/diagram.constants';

/** Icon packs are heavy and rarely used, so they are served on demand from here, never from a third party. */
const booksOfPictures: Record<string, IconifyJSON> = {
  [DIAGRAM_BRAND_ICONS_NAME]: brandIcons,
  [DIAGRAM_MATERIAL_ICONS_NAME]: materialIcons,
};

/** The name comes from the URL, so inherited keys such as `constructor` must not count as packs. */
export const readDiagramIcons = (name: string): IconifyJSON | null =>
  Object.hasOwn(booksOfPictures, name) ? (booksOfPictures[name] ?? null) : null;
