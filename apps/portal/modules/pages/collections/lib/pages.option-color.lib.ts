import type { PageOptionColor } from '@company-brain/shared';
import { PAGE_OPTION_COLOR_CLASSES, PAGE_OPTION_NO_COLOR_CLASS } from '../constants/pages.option-color.constants';

/** How an option is painted, whatever color it carries or none at all. */
export const readPageOptionColorClass = (color: PageOptionColor | null): string =>
  color === null ? PAGE_OPTION_NO_COLOR_CLASS : PAGE_OPTION_COLOR_CLASSES[color];
