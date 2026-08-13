'use client';

import { type RefObject, useCallback, useState } from 'react';
import type { PageEditorCollectionHost } from '../types/pages.editor.surface.types';

const readCollectionHosts = (editorHost: HTMLElement): readonly PageEditorCollectionHost[] =>
  Array.from(editorHost.querySelectorAll<HTMLElement>('[data-page-collection]')).flatMap((element) => {
    const pageId = element.dataset.pageCollection;
    return pageId === undefined ? [] : [{ element, pageId }];
  });

const isSameHosts = (
  previous: readonly PageEditorCollectionHost[],
  next: readonly PageEditorCollectionHost[],
): boolean => previous.length === next.length && previous.every((host, index) => host.element === next[index]?.element);

/**
 * Where each collection block is standing on the page, so the collection itself
 * can be rendered into it.
 *
 * The list only changes when the elements do, so a page full of collections is
 * not rebuilt on every keystroke.
 */
export const usePagesEditorCollectionHosts = (
  editorHostRef: RefObject<HTMLElement | null>,
): { readonly hosts: readonly PageEditorCollectionHost[]; readonly sync: () => void } => {
  const [hosts, setHosts] = useState<readonly PageEditorCollectionHost[]>([]);

  const sync = useCallback((): void => {
    const editorHost = editorHostRef.current;
    if (editorHost === null) return;
    const nextHosts = readCollectionHosts(editorHost);
    setHosts((previous) => (isSameHosts(previous, nextHosts) ? previous : nextHosts));
  }, [editorHostRef]);

  return { hosts, sync };
};
