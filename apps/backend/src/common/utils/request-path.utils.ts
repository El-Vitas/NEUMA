/** The query string carries what people search for and opaque cursors, so logs keep only the path. */
export const readPathWithoutQuery = (url: string | undefined): string | undefined => url?.split('?')[0];
