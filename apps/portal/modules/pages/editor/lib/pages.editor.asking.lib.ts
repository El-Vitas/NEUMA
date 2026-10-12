/**
 * Swallows a browser refusal on purpose: fullscreen, autoplay and clipboard calls can be denied,
 * and that is not an error worth an unhandled rejection.
 */
export const askTheBrowser = (asked: Promise<unknown> | undefined, answered?: () => void): void => {
  if (asked === undefined) return;
  void asked.then(
    () => answered?.(),
    () => undefined,
  );
};

export const isShownWhole = (): boolean => document.fullscreenElement !== null;

export const askForTheWholeScreen = (block: HTMLElement): void => {
  askTheBrowser(isShownWhole() ? document.exitFullscreen() : block.requestFullscreen());
};
