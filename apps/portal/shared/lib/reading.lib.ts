/**
 * Watches which stretch of a long text is being read, and says which one it is.
 *
 * What counts as being read is the last heading that has passed the line where
 * reading happens, near the top of the screen: the heading somebody is under,
 * rather than the one that happens to be closest to the middle, which is where
 * the eye is only for an instant on the way past. Above the first heading the
 * first one is the answer, because a page always begins somewhere. The answer
 * is the heading itself, so it serves both a text whose headings answer to a
 * name and one whose headings are only written. What comes back stops watching.
 */
export const watchWhatIsBeingRead = (
  headings: readonly HTMLElement[],
  read: (being: HTMLElement | null) => void,
  line: number,
): (() => void) => {
  if (headings.length === 0) return () => undefined;

  const look = (): void => {
    const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= line);
    read(passed.at(-1) ?? headings[0] ?? null);
  };

  let looking = 0;
  const lookOnce = (): void => {
    if (looking !== 0) return;
    looking = window.requestAnimationFrame(() => {
      looking = 0;
      look();
    });
  };

  look();
  window.addEventListener('scroll', lookOnce, { capture: true, passive: true });
  window.addEventListener('resize', lookOnce, { passive: true });

  return () => {
    if (looking !== 0) window.cancelAnimationFrame(looking);
    window.removeEventListener('scroll', lookOnce, { capture: true });
    window.removeEventListener('resize', lookOnce);
  };
};
