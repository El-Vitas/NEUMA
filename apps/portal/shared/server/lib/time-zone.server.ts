import 'server-only';

import { isValidPageTimeZone } from '@neuma/shared';
import { cookies } from 'next/headers';
import { TIME_ZONE_COOKIE } from '@/shared/constants/time-zone.constants';

/** The zone the browser told us about, or null before it has: the server then reads dates in UTC. */
export const readRequestTimeZone = async (): Promise<null | string> => {
  const stored = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return stored !== undefined && isValidPageTimeZone(stored) ? stored : null;
};
