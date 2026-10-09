/** The active heading is the last one past a reading line near the top; above the first heading, the first wins. */
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
    looking = globalThis.requestAnimationFrame(() => {
      looking = 0;
      look();
    });
  };

  look();
  globalThis.addEventListener('scroll', lookOnce, { capture: true, passive: true });
  globalThis.addEventListener('resize', lookOnce, { passive: true });

  return () => {
    if (looking !== 0) globalThis.cancelAnimationFrame(looking);
    globalThis.removeEventListener('scroll', lookOnce, { capture: true });
    globalThis.removeEventListener('resize', lookOnce);
  };
};
