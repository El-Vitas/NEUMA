import { PAGE_PERCENT_FACTOR } from './page-property.constants.js';
import type { PagePropertyConfig } from './page-property.types.js';
import { PAGE_NUMBER_FORMAT } from './page-property.types.js';

/** Twelve significant digits hide the float noise of products such as 0.07 * 100 without losing a real digit. */
const SIGNIFICANT_DIGITS = 12;

const clean = (value: number): number => Number(value.toPrecision(SIGNIFICANT_DIGITS));

export const percentToFraction = (percent: number): number => clean(percent / PAGE_PERCENT_FACTOR);

export const fractionToPercent = (fraction: number): number => clean(fraction * PAGE_PERCENT_FACTOR);

const readShownNumber = (value: number, config: PagePropertyConfig): number =>
  config.numberFormat === PAGE_NUMBER_FORMAT.PERCENT ? fractionToPercent(value) : value;

/** What a person reads decides the decimals: a percent of 25.5 has one, though the stored 0.255 has three. */
export const hasAllowedDecimals = (value: number, config: PagePropertyConfig): boolean => {
  if (config.decimals === null) return true;
  const shown = readShownNumber(value, config);
  return clean(Number(shown.toFixed(config.decimals))) === clean(shown);
};

const writeDigits = (shown: number, config: PagePropertyConfig): string =>
  config.decimals === null ? String(shown) : shown.toFixed(config.decimals);

export const formatPageUniqueId = (prefix: string, value: number): string =>
  prefix === '' ? String(value) : `${prefix}-${String(value)}`;

/** Plain text with no locale, so an export, the MCP and a test all read the same. The portal formats for the eye. */
export const formatPageNumber = (value: number, config: PagePropertyConfig): string => {
  const digits = writeDigits(readShownNumber(value, config), config);
  if (config.numberFormat === PAGE_NUMBER_FORMAT.PERCENT) return `${digits}%`;
  if (config.numberFormat === PAGE_NUMBER_FORMAT.CURRENCY) return `${config.currency ?? ''} ${digits}`.trim();
  return digits;
};
