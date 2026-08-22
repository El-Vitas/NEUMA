/**
 * Asks the browser for something that may be refused, and lets the refusal be.
 *
 * A refusal is not an error on the page: taking a block to the whole screen can
 * be denied, a player can be stopped before it starts, and the clipboard can be
 * out of reach. Left alone, each of those becomes an unhandled rejection and
 * the page shows a fault for something nobody did wrong.
 */
export const askTheBrowser = (asked: Promise<unknown> | undefined, answered?: () => void): void => {
  if (asked === undefined) return;
  void asked.then(
    () => answered?.(),
    () => undefined,
  );
};

/** Whether the page is being shown whole, so a control can say which way it goes. */
export const isShownWhole = (): boolean => document.fullscreenElement !== null;

/** Takes a block to the whole screen, or brings it back. */
export const askForTheWholeScreen = (block: HTMLElement): void => {
  askTheBrowser(isShownWhole() ? document.exitFullscreen() : block.requestFullscreen());
};
