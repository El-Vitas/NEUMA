import type { PageNumberFormat } from '@neuma/shared';
import { PAGE_NUMBER_FORMAT_VALUES } from '@neuma/shared';
import { PAGE_DECIMALS_ANY_CHOICE } from '../constants/pages.schema-editing.constants';

/** Narrows the plain string of a select by lookup instead of a cast. */
export const readNumberFormatChoice = (chosen: string): PageNumberFormat | undefined =>
  PAGE_NUMBER_FORMAT_VALUES.find((candidate) => candidate === chosen);

/** `null` leaves the decimals free. */
export const readDecimalsChoice = (chosen: string): number | null => {
  if (chosen === PAGE_DECIMALS_ANY_CHOICE) return null;
  const decimals = Number(chosen);
  return Number.isInteger(decimals) && decimals >= 0 ? decimals : null;
};
