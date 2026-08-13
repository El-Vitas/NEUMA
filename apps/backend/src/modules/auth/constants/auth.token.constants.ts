export const TOKEN_LIFETIME_PATTERN = /^(\d+)([smhd])?$/;

export const TOKEN_LIFETIME_SECONDS_PER_UNIT: Readonly<Record<string, number>> = {
  d: 86_400,
  h: 3600,
  m: 60,
  s: 1,
};
