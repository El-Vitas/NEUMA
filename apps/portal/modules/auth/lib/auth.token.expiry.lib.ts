import { JWT_TOKEN_SECTIONS } from '../constants/cookie.options.constants';

const readPayload = (token: string): Record<string, unknown> | null => {
  const sections = token.split('.');
  if (sections.length !== JWT_TOKEN_SECTIONS) return null;
  const payload = sections[1];
  if (payload === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/**
 * Reads whether an access token is spent, without verifying it.
 *
 * Only the backend can say whether a token is genuine; this reading is used to
 * decide when to ask for a new one, so a page is never rendered with a token
 * that is about to be rejected. A token that cannot be read counts as spent.
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
