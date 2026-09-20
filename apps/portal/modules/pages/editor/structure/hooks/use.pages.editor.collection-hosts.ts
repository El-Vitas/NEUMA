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
  /**
   * Each spot answers to a name of its own, minted the first time it is seen.
   * Naming them after the collection they show would give two spots the same
   * name when a page shows one collection twice — and, for a moment while a
   * block is being dragged, when it shows one collection once.
   */
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
