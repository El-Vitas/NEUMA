/** Time as the scheduler of versions sees it, so a test can move it by hand. */
export interface PageVersionClock {
  /** Runs `work` after `milliseconds`; the returned function cancels it. */
  readonly after: (milliseconds: number, work: () => void) => () => void;
}

/** The blocks written by one person since the last version was cut for them, and the timers that will cut it. */
export interface PendingPageVersion {
  readonly authorId: string;
  readonly blockIds: Set<string>;
  readonly cancelIdle: () => void;
  readonly cancelMaxWait: () => void;
}

export interface PageOwnerFinder {
  /** The nearest page above each block, or the block itself when it is a page. */
  readonly findOwningPageIds: (blockIds: readonly string[]) => Promise<string[]>;
}

export interface PageVersionRecorder {
  readonly record: (pageId: string, authorId: string) => Promise<void>;
}

export interface PageVersionLogger {
  readonly error: (context: Record<string, unknown>, message: string) => void;
}
