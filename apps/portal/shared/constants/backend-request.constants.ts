/** A hung backend would otherwise hold every render and action until the platform kills the connection. */
export const BACKEND_REQUEST_TIMEOUT_MILLISECONDS = 30_000;

/** Exports build a whole archive before answering. */
export const BACKEND_FILE_REQUEST_TIMEOUT_MILLISECONDS = 120_000;
