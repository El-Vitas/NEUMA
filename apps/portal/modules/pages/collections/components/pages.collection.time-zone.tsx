'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { rememberTimeZoneAction } from '@/shared/server/actions/time-zone.actions';

interface IProps {
  /** The zone the server read the dates in; null before the browser has told it. */
  readonly knownTimeZone: null | string;
}

/**
 * "Today" and "this week" are the calendar of the person looking. The browser knows its zone and the server does not,
 * so the first time (or after travelling) it says so and the view is read again in that zone.
 */
export const PagesCollectionTimeZone = ({ knownTimeZone }: IProps) => {
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone === knownTimeZone) return;
    void rememberTimeZoneAction({ timeZone: browserTimeZone }).then(() => router.refresh());
  }, [knownTimeZone, router]);

  return null;
};
