'use client';

import { useEffect, useRef, useState } from 'react';
import type { PagesEditorTitle } from '../types/pages.editor.title.types';

/** The title being typed. A title the server changed (a restored version) replaces it; same data keeps typing. */
export const usePagesEditorTitle = (serverTitle: string): PagesEditorTitle => {
  const [title, setTitle] = useState(serverTitle);
  const [knownServerTitle, setKnownServerTitle] = useState(serverTitle);
  const titleRef = useRef(title);

  if (serverTitle !== knownServerTitle) {
    setKnownServerTitle(serverTitle);
    setTitle(serverTitle);
  }

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  return { setTitle, title, titleRef };
};
