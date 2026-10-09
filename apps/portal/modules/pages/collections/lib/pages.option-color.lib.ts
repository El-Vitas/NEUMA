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

export const readPageOptionColorClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_COLOR_CLASS : PAGE_OPTION_COLOR_CLASSES[color];

export const readPageOptionSurfaceClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_SURFACE_CLASS : PAGE_OPTION_SURFACE_CLASSES[color];

export const readPageOptionDotClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_DOT_CLASS : PAGE_OPTION_DOT_CLASSES[color];

export const readPageOptionFillClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_FILL_CLASS : PAGE_OPTION_FILL_CLASSES[color];
