import { JWT_TOKEN_SECTIONS } from '../constants/cookie.options.constants';

const readPayload = (token: string): Record<string, unknown> | null => {
  const sections = token.split('.');
  if (sections.length !== JWT_TOKEN_SECTIONS) return null;
  const payload = sections[1];
  if (payload === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/**
 * Does not verify the token, only the backend can; it decides when to refresh so no page renders with a token
 * about to be rejected. An unreadable token counts as spent.
 */
export const isAccessTokenSpent = (parameters: {
  readonly leewaySeconds: number;
  readonly nowSeconds: number;
  readonly token: string | undefined;
}): boolean => {
  if (parameters.token === undefined) return true;
  const payload = readPayload(parameters.token);
  const expiry = payload?.exp;
  if (typeof expiry !== 'number') return true;
  return expiry - parameters.leewaySeconds <= parameters.nowSeconds;
};
