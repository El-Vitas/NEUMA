'use client';

import { type RefObject, useCallback, useRef, useState } from 'react';
import type { PageEditorCollectionHost } from '../../menus/types/pages.editor.surface.types';

const readCollectionHosts = (
  editorHost: HTMLElement,
  nameTheHost: (element: HTMLElement) => string,
): readonly PageEditorCollectionHost[] =>
  Array.from(editorHost.querySelectorAll<HTMLElement>('[data-page-collection]')).flatMap((element) => {
    const pageId = element.dataset.pageCollection;
    if (pageId === undefined) return [];
    return [{ element, name: nameTheHost(element), pageId, viewName: element.dataset.viewName ?? null }];
  });

const isSameHosts = (
  previous: readonly PageEditorCollectionHost[],
  next: readonly PageEditorCollectionHost[],
): boolean => previous.length === next.length && previous.every((host, index) => host.element === next[index]?.element);

/** The list keeps its identity unless the elements change, so a keystroke does not rebuild every collection. */
export const usePagesEditorCollectionHosts = (
  editorHostRef: RefObject<HTMLElement | null>,
): { readonly hosts: readonly PageEditorCollectionHost[]; readonly sync: () => void } => {
  const [hosts, setHosts] = useState<readonly PageEditorCollectionHost[]>([]);
  // Names are minted per element, not taken from the collection: one collection can appear in two spots,
  // including briefly while a block is dragged.
  const namesRef = useRef(new WeakMap<HTMLElement, string>());
  const mintedRef = useRef(0);

  const nameTheHost = useCallback((element: HTMLElement): string => {
    const known = namesRef.current.get(element);
    if (known !== undefined) return known;
    mintedRef.current += 1;
    const minted = `collection-${String(mintedRef.current)}`;
    namesRef.current.set(element, minted);
    return minted;
  }, []);

  const sync = useCallback((): void => {
    const editorHost = editorHostRef.current;
    if (editorHost === null) return;
    const nextHosts = readCollectionHosts(editorHost, nameTheHost);
    setHosts((previous) => (isSameHosts(previous, nextHosts) ? previous : nextHosts));
  }, [editorHostRef, nameTheHost]);

  return { hosts, sync };
};
