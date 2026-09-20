import type { PageOptionColor } from '@company-brain/shared';
import {
  PAGE_OPTION_COLOR_CLASSES,
  PAGE_OPTION_DOT_CLASSES,
  PAGE_OPTION_FILL_CLASSES,
  PAGE_OPTION_NO_COLOR_CLASS,
  PAGE_OPTION_NO_DOT_CLASS,
  PAGE_OPTION_NO_FILL_CLASS,
  PAGE_OPTION_NO_SURFACE_CLASS,
  PAGE_OPTION_SURFACE_CLASSES,
} from '../constants/pages.option-color.constants';

/** How an option is painted, whatever color it carries or none at all. */
export const readPageOptionColorClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_COLOR_CLASS : PAGE_OPTION_COLOR_CLASSES[color];

/** El mismo color llevado a la superficie de una columna, mucho más tenue. */
export const readPageOptionSurfaceClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_SURFACE_CLASS : PAGE_OPTION_SURFACE_CLASSES[color];

/** El mismo color reducido a un punto, para donde el nombre va sin teñir. */
export const readPageOptionDotClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_DOT_CLASS : PAGE_OPTION_DOT_CLASSES[color];

/** El mismo color para pintar una figura de un dibujo, donde el color es el dato. */
export const readPageOptionFillClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_FILL_CLASS : PAGE_OPTION_FILL_CLASSES[color];
