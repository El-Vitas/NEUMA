'use client';

import { useEffect } from 'react';

/** Follows renames the server is not told about while typing; a page without a title leaves the tab untouched. */
export const usePagesDocumentTitle = (documentTitle: string | null): void => {
  useEffect(() => {
    if (documentTitle === null) return;
    document.title = documentTitle;
  }, [documentTitle]);
};
