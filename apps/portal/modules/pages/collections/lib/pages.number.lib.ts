import type { PagePropertyConfig } from '@neuma/shared';
import { PAGE_NUMBER_ANY_STEP, PAGE_NUMBER_DECIMAL_BASE } from '../constants/pages.number.constants';

/** The browser nudges and validates by this: a number with two decimals moves by a hundredth. */
export const readNumberStep = (config: PagePropertyConfig): number | string =>
  config.decimals === null ? PAGE_NUMBER_ANY_STEP : PAGE_NUMBER_DECIMAL_BASE ** -config.decimals;
