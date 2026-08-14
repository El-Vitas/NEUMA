import { DOCS_READING_MARGIN } from '../constants/docs.reading.constants';

/**
 * Watches which stretch of a document is being read, and says which one it is.
 *
 * What counts as being read is what has reached the top of the screen and not
 * yet left it: the heading somebody is under, rather than the one that happens
 * to be closest to the middle, which is where the eye is only for an instant on
 * the way past. What comes back stops the watching.
 */
export const watchWhatIsBeingRead = (ids: readonly string[], read: (id: string | null) => void): (() => void) => {
  const headings = ids.map((id) => document.getElementById(id)).filter((heading) => heading !== null);
  if (headings.length === 0) return () => undefined;

  const watching = new IntersectionObserver(
    (seen) => {
      const above = seen.filter((one) => one.isIntersecting).map((one) => one.target.id);
      if (above.length > 0) read(ids.find((id) => above.includes(id)) ?? null);
    },
    { rootMargin: DOCS_READING_MARGIN },
  );
  for (const heading of headings) watching.observe(heading);

  return () => watching.disconnect();
};
