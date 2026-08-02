const ORIGIN_SEPARATOR = ',';

export const parseCorsOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(ORIGIN_SEPARATOR)
    .map((origin) => origin.trim())
    .filter(Boolean);
