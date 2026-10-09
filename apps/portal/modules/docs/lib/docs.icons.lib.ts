import { DIAGRAM_ICONS_PATH } from '@/shared/constants/diagram.constants';
import { DOCS_ORDINARY_ICON_SIDE } from '../constants/docs.style.constants';
import type { DocsIconDrawing, DocsNamedIcon } from '../types/docs.types';

/** One `book:name` per line, the same form a diagram uses, so what the reader sees is what they copy. */
export const readNamedIcons = (named: string): readonly DocsNamedIcon[] =>
  named
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(':'))
    .map((said) => ({ book: said.slice(0, said.indexOf(':')), name: said.slice(said.indexOf(':') + 1), said }));

export const askForIconBooks = async (books: readonly string[]): Promise<readonly unknown[]> => {
  const asked = await Promise.all(books.map((book) => fetch(`${DIAGRAM_ICONS_PATH}${book}`)));
  return Promise.all(asked.map((answer): Promise<unknown> => answer.json()));
};

const readsAsIcon = (asked: unknown): asked is { readonly body: string } =>
  typeof asked === 'object' && asked !== null && 'body' in asked && typeof asked.body === 'string';

const readsAsBook = (asked: unknown): asked is { readonly icons: Record<string, unknown> } =>
  typeof asked === 'object' && asked !== null && 'icons' in asked && typeof asked.icons === 'object';

/** Falls back from the icon to its book to the default side. */
const readSide = (side: 'height' | 'width', drawn: unknown, book: unknown): number => {
  for (const asked of [drawn, book]) {
    if (typeof asked !== 'object' || asked === null) continue;
    const said = Reflect.get(asked, side);
    if (typeof said === 'number' && said > 0) return said;
  }
  return DOCS_ORDINARY_ICON_SIDE;
};

/** Width and height come with the drawing because icons are not all square; a wrong viewBox crops them. */
export const readIconDrawing = (book: unknown, name: string): DocsIconDrawing | null => {
  if (!readsAsBook(book)) return null;
  const drawn = book.icons[name];
  if (!readsAsIcon(drawn)) return null;
  return { body: drawn.body, height: readSide('height', drawn, book), width: readSide('width', drawn, book) };
};
