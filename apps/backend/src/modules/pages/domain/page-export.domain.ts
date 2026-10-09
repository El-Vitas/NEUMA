import { type PageContent, pageContentSchema } from '@neuma/shared';
import { EMPTY_EXPORTED_DOCUMENT } from './page-export.domain.constants';
import type { ExportablePage, OrderedExportPage, PageExportScope } from './page-export.domain.types';

/** An unrecognized body falls back to an empty page so it cannot take the whole export down. */
export const readExportableContent = (stored: unknown): PageContent => {
  const understood = pageContentSchema.safeParse(stored);
  return understood.success ? understood.data : EMPTY_EXPORTED_DOCUMENT;
};

export const readExportScope = (
  kind: PageExportScope['kind'],
  pageId: null | string,
  pageIds: readonly string[],
): null | PageExportScope => {
  if (kind === 'space') return { kind: 'space' };
  if (kind === 'pages') return pageIds.length === 0 ? null : { kind, pageIds };
  return pageId === null ? null : { kind, pageId };
};

/** Pages an export covers in sidebar order (parent before children, then siblings), not database order. */
export const orderPagesForExport = <T extends ExportablePage>(pages: readonly T[]): readonly OrderedExportPage<T>[] => {
  const childrenOf = (parentId: null | string): readonly T[] =>
    pages.filter((page) => page.parentId === parentId).sort((one, other) => one.order - other.order);

  const walk = (parentId: null | string, path: readonly string[]): readonly OrderedExportPage<T>[] =>
    childrenOf(parentId).flatMap((page) => [{ ...page, path }, ...walk(page.id, [...path, page.title])]);

  return walk(null, []);
};

const collectPagesBelow = (pages: readonly ExportablePage[], rootId: string): ReadonlySet<string> => {
  const found = new Set<string>();
  const descend = (parentId: string): void => {
    for (const page of pages) {
      if (page.parentId === parentId && !found.has(page.id)) {
        found.add(page.id);
        descend(page.id);
      }
    }
  };
  descend(rootId);
  return found;
};

export const selectPagesForExport = <T extends ExportablePage>(
  pages: readonly T[],
  scope: PageExportScope,
): readonly OrderedExportPage<T>[] => {
  const ordered = orderPagesForExport(pages);
  if (scope.kind === 'space') return ordered;

  if (scope.kind === 'pages') {
    const asked = new Set(scope.pageIds);
    return ordered.filter((page) => asked.has(page.id));
  }

  const asked = ordered.find((page) => page.id === scope.pageId);
  if (asked === undefined) return [];
  if (scope.kind === 'page') return [asked];

  const belowIt = collectPagesBelow(ordered, scope.pageId);
  return ordered.filter((page) => page.id === scope.pageId || belowIt.has(page.id));
};
