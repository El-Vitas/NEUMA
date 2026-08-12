import { TOKEN_LIFETIME_PATTERN, TOKEN_LIFETIME_SECONDS_PER_UNIT } from '../constants/auth.token.constants';

/**
 * Reads a token lifetime written the way JWT libraries accept it — `15m`,
 * `6h`, `7d`, or plain seconds — as a number of seconds.
 *
 * The session hands this number to whoever stores the token, so a cookie
 * cannot be kept for longer than the token inside it is valid.
 */
export const parseTokenLifetimeSeconds = (raw: string, fallbackSeconds: number): number => {
  const match = TOKEN_LIFETIME_PATTERN.exec(raw.trim());
  if (match === null) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const secondsPerUnit = TOKEN_LIFETIME_SECONDS_PER_UNIT[unit];
  if (secondsPerUnit === undefined || amount <= 0) return fallbackSeconds;
  return amount * secondsPerUnit;
};
