import 'server-only';
import type { IconifyJSON } from '@iconify/types';
import { icons as brandIcons } from '@iconify-json/logos';
import { icons as materialIcons } from '@iconify-json/mdi';
import { DIAGRAM_BRAND_ICONS_NAME, DIAGRAM_MATERIAL_ICONS_NAME } from '@/shared/constants/diagram.constants';

/**
 * The books of pictures a diagram may name, which stay on this side.
 *
 * They weigh more than everything else a page loads and almost no diagram asks
 * for a picture, so they are kept here and handed over one at a time to the
 * diagram that names one — and handed over by us, so that drawing a diagram is
 * never a question asked of somebody else's server.
 */
const booksOfPictures: Record<string, IconifyJSON> = {
  [DIAGRAM_BRAND_ICONS_NAME]: brandIcons,
  [DIAGRAM_MATERIAL_ICONS_NAME]: materialIcons,
};

export const readDiagramIcons = (name: string): IconifyJSON | null => booksOfPictures[name] ?? null;
