'use client';

import { useEffect } from 'react';

/**
 * Keeps the browser tab reading the name of the page one is on.
 *
 * The served document already arrives with it; this follows the renaming, which
 * the server is not told about while somebody is still typing it. A page that
 * has no name yet asks for nothing, so the tab keeps whatever it already said.
 */
export const usePagesDocumentTitle = (documentTitle: string | null): void => {
  useEffect(() => {
    if (documentTitle === null) return;
    document.title = documentTitle;
  }, [documentTitle]);
};
