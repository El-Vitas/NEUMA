import { TOKEN_LIFETIME_PATTERN, TOKEN_LIFETIME_SECONDS_PER_UNIT } from '../constants/auth.token.constants';

/** Parses a JWT-style lifetime (`15m`, `6h`, `7d`, plain seconds) so a cookie never outlives its token. */
export const parseTokenLifetimeSeconds = (raw: string, fallbackSeconds: number): number => {
  const match = TOKEN_LIFETIME_PATTERN.exec(raw.trim());
  if (match === null) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const secondsPerUnit = TOKEN_LIFETIME_SECONDS_PER_UNIT[unit];
  if (secondsPerUnit === undefined || amount <= 0) return fallbackSeconds;
  return amount * secondsPerUnit;
};
