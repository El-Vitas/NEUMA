import { type PageContent, pageContentSchema } from '@company-brain/shared';
import { EMPTY_EXPORTED_DOCUMENT } from './page-export.domain.constants';
import type { ExportablePage, OrderedExportPage, PageExportScope } from './page-export.domain.types';

/**
 * The content of a page as the export can read it, or an empty page.
 *
 * A page whose body the schema no longer recognizes still comes out of the
 * export — with its name and its place in the tree — instead of taking the
 * whole file down with it. Losing one body is a smaller harm than losing
 * everything somebody asked to take with them.
 */
export const readExportableContent = (stored: unknown): PageContent => {
  const understood = pageContentSchema.safeParse(stored);
  return understood.success ? understood.data : EMPTY_EXPORTED_DOCUMENT;
};

/** The scope somebody asked for, or nothing when they asked for a page without saying which. */
export const readExportScope = (kind: PageExportScope['kind'], pageId: null | string): null | PageExportScope => {
  if (kind === 'space') return { kind: 'space' };
  return pageId === null ? null : { kind, pageId };
};

/**
 * The pages an export covers, read down the tree the way the tree is read.
 *
 * A mother comes before her daughters and a daughter before her sister, which
 * is the order somebody looking at the sidebar would read them in — so the
 * file comes out in the shape the tree already had, not in whatever order the
 * database happened to answer.
 */
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

/** Which pages a scope covers, already in the order they should be read. */
export const selectPagesForExport = <T extends ExportablePage>(
  pages: readonly T[],
  scope: PageExportScope,
): readonly OrderedExportPage<T>[] => {
  const ordered = orderPagesForExport(pages);
  if (scope.kind === 'space') return ordered;

  const asked = ordered.find((page) => page.id === scope.pageId);
  if (asked === undefined) return [];
  if (scope.kind === 'page') return [asked];

  const belowIt = collectPagesBelow(ordered, scope.pageId);
  return ordered.filter((page) => page.id === scope.pageId || belowIt.has(page.id));
};
