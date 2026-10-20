import type { PageVersionClock } from '../../types/page.version.types';

/** The clock of the process. A timer never keeps the backend alive: what waits is cut when it stops. */
export const systemPageVersionClock: PageVersionClock = {
  after: (milliseconds, work) => {
    const timer = setTimeout(work, milliseconds);
    timer.unref();
    return () => {
      clearTimeout(timer);
    };
  },
};
