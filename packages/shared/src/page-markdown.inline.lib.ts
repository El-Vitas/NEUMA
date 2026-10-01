import { z } from 'zod';
import {
  MARKDOWN_AMOUNT_AFTER_DOLLAR,
  MARKDOWN_DATE_TARGET,
  MARKDOWN_ESCAPABLE_CHARACTERS,
  MARKDOWN_FORMULA_DELIMITER,
  MARKDOWN_PAGE_PATH_PATTERN,
  MARKDOWN_PAIRED_MARKS,
  MARKDOWN_PERSON_PREFIX,
  MARKDOWN_PERSON_TARGET,
  MARKDOWN_TAG_MARKS,
  MARKDOWN_TAG_OPENING,
} from './constants/page-markdown.constants.js';
import { Result } from './result.js';
import {
  isPageCalendarDay,
  isPageLinkTarget,
  PAGE_BLOCK_COLORS,
  type PageBlockColor,
  type PageContentInlineNode,
  type PageMark,
} from './schemas/page-content.schema.js';

type InlineNode = PageContentInlineNode;

/** Lo que se leyó en un punto del texto: los nodos que salieron y cuántos caracteres ocupaban. */
interface ReadConstruct {
  readonly consumed: number;
  readonly nodes: readonly InlineNode[];
}

type ConstructReading = Result<ReadConstruct, string> | null;

const personIdSchema = z.uuid();

const writeText = (text: string, marks: readonly PageMark[]): InlineNode =>
  marks.length === 0 ? { text, type: 'text' } : { marks: [...marks], text, type: 'text' };

const addMark = (marks: readonly PageMark[], mark: PageMark): readonly PageMark[] =>
  marks.some((carried) => carried.type === mark.type) ? marks : [...marks, mark];

const isEscaped = (source: string, at: number): boolean => source[at - 1] === '\\';

/** Un carácter tal cual, o el que va después de una barra que lo escapa. */
const readLiteral = (source: string, at: number): { readonly character: string; readonly width: number } => {
  const next = source.charAt(at + 1);
  if (source.charAt(at) === '\\' && MARKDOWN_ESCAPABLE_CHARACTERS.includes(next)) return { character: next, width: 2 };
  return { character: source.charAt(at), width: 1 };
};

/** Dónde cierra un signo que se abrió: el primero que no está escapado, no va tras un espacio ni pegado a otro igual. */
const findClosing = (source: string, delimiter: string, from: number): number => {
  for (let at = source.indexOf(delimiter, from); at !== -1; at = source.indexOf(delimiter, at + 1)) {
    const isGluedToAnother = source[at + delimiter.length] === delimiter[0];
    const followsSpace = source[at - 1] === ' ';
    if (at > from && !isGluedToAnother && !followsSpace && !isEscaped(source, at)) return at;
  }
  return -1;
};

/** Dónde cierra un corchete o un paréntesis, contando los que se abren dentro. */
const findBracketEnd = (source: string, openAt: number, open: string, close: string): number => {
  let depth = 0;
  for (let at = openAt; at < source.length; at += 1) {
    if (isEscaped(source, at)) continue;
    if (source[at] === open) depth += 1;
    if (source[at] === close) depth -= 1;
    if (depth === 0) return at;
  }
  return -1;
};

const readPerson = (label: string, target: string): Result<readonly InlineNode[], string> => {
  const userId = target.slice(MARKDOWN_PERSON_TARGET.length);
  if (!personIdSchema.safeParse(userId).success)
    return Result.fail(`"${target}" does not name a person: write it as [@Name](person:<their id>).`);
  const name = label.startsWith(MARKDOWN_PERSON_PREFIX) ? label.slice(MARKDOWN_PERSON_PREFIX.length) : label;
  return Result.ok([{ attrs: { label: name.trim(), userId }, type: 'person' }]);
};

const readDate = (target: string): Result<readonly InlineNode[], string> => {
  const at = target.slice(MARKDOWN_DATE_TARGET.length);
  return isPageCalendarDay(at)
    ? Result.ok([{ attrs: { at }, type: 'date' }])
    : Result.fail(`"${at}" is not a day: write a date as [label](date:YYYY-MM-DD).`);
};

/**
 * Lo que dice un enlace, según a dónde lleva: a una persona, a un día, a una
 * página de Company Brain (una mención), o a otro sitio (un enlace sobre sus
 * palabras). Es lo mismo que la página escribe al leerse, al revés.
 */
const readLinkTarget = (
  label: string,
  target: string,
  marks: readonly PageMark[],
): Result<readonly InlineNode[], string> => {
  if (target.startsWith(MARKDOWN_PERSON_TARGET)) return readPerson(label, target);
  if (target.startsWith(MARKDOWN_DATE_TARGET)) return readDate(target);
  const page = MARKDOWN_PAGE_PATH_PATTERN.exec(target);
  if (page !== null) return Result.ok([{ attrs: { label, pageId: page[2], spaceId: page[1] }, type: 'mention' }]);
  if (!isPageLinkTarget(target))
    return Result.fail(`"${target}" is not a link a page can keep: use an http, https or mailto address.`);
  return readSpan(label, addMark(marks, { attrs: { href: target }, type: 'link' }));
};

const readLink = (source: string, at: number, marks: readonly PageMark[]): ConstructReading => {
  const labelEnd = findBracketEnd(source, at, '[', ']');
  if (labelEnd === -1 || source[labelEnd + 1] !== '(') return null;
  const targetEnd = findBracketEnd(source, labelEnd + 1, '(', ')');
  if (targetEnd === -1) return null;
  const nodes = readLinkTarget(source.slice(at + 1, labelEnd), source.slice(labelEnd + 2, targetEnd).trim(), marks);
  return nodes.isFail()
    ? Result.fail(nodes.getError())
    : Result.ok({ consumed: targetEnd + 1 - at, nodes: nodes.getValue() });
};

const readCode = (source: string, at: number, marks: readonly PageMark[]): ConstructReading => {
  const closing = source.indexOf('`', at + 1);
  if (closing <= at + 1) return null;
  return Result.ok({
    consumed: closing + 1 - at,
    nodes: [writeText(source.slice(at + 1, closing), addMark(marks, { type: 'code' }))],
  });
};

/** Negrita, cursiva o tachado, si el signo que empieza aquí tiene con qué cerrar. */
const readPairedMark = (source: string, at: number, marks: readonly PageMark[]): ConstructReading => {
  const paired = MARKDOWN_PAIRED_MARKS.find(({ delimiter }) => source.startsWith(delimiter, at));
  if (paired === undefined) return null;
  const start = at + paired.delimiter.length;
  const opensWords = source.charAt(start) !== '' && source.charAt(start) !== ' ';
  const closing = opensWords ? findClosing(source, paired.delimiter, start) : -1;
  if (closing === -1) return null;
  const inner = readSpan(source.slice(start, closing), addMark(marks, { type: paired.mark }));
  if (inner.isFail()) return Result.fail(inner.getError());
  return Result.ok({ consumed: closing + paired.delimiter.length - at, nodes: inner.getValue() });
};

/** Dónde cierra una fórmula: un signo pegado a lo último que dice, y que no va seguido de un número. */
const findFormulaEnd = (source: string, from: number): number => {
  for (
    let at = source.indexOf(MARKDOWN_FORMULA_DELIMITER, from);
    at !== -1;
    at = source.indexOf(MARKDOWN_FORMULA_DELIMITER, at + 1)
  ) {
    const followsSpace = source.charAt(at - 1) === ' ';
    const opensAnAmount = MARKDOWN_AMOUNT_AFTER_DOLLAR.test(source.charAt(at + 1));
    if (at > from && !followsSpace && !opensAnAmount && !isEscaped(source, at)) return at;
  }
  return -1;
};

/** Una fórmula entre signos de dólar, si lo es: un precio suelto se queda como texto. */
const readFormula = (source: string, at: number): ConstructReading => {
  const first = source.charAt(at + 1);
  if (first === '' || first === ' ') return null;
  const closing = findFormulaEnd(source, at + 1);
  if (closing === -1) return null;
  return Result.ok({
    consumed: closing + 1 - at,
    nodes: [{ attrs: { latex: source.slice(at + 1, closing) }, type: 'formula' }],
  });
};

const isPageColor = (color: string): color is PageBlockColor => PAGE_BLOCK_COLORS.some((known) => known === color);

/** La marca que dice una etiqueta, si es una de las que la página pinta y dice lo que necesita. */
const readTagMark = (tag: string, color: string | undefined): Result<PageMark, string> | null => {
  if (tag === MARKDOWN_TAG_MARKS.underline) return color === undefined ? Result.ok({ type: 'underline' }) : null;
  if (color === undefined) return null;
  if (!isPageColor(color))
    return Result.fail(`"${color}" is not a colour a page has: use one of ${PAGE_BLOCK_COLORS.join(', ')}.`);
  return Result.ok(
    tag === MARKDOWN_TAG_MARKS.text_color
      ? { attrs: { color }, type: 'text_color' }
      : { attrs: { color }, type: 'background_color' },
  );
};

/** Subrayado, color de texto o resaltado escritos como su etiqueta de HTML; otra etiqueta, o una sin cerrar, es texto. */
const readTag = (source: string, at: number, marks: readonly PageMark[]): ConstructReading => {
  const opening = MARKDOWN_TAG_OPENING.exec(source.slice(at));
  if (opening === null) return null;
  const [written, tag = '', color] = opening;
  const closing = source.indexOf(`</${tag}>`, at + written.length);
  if (closing === -1) return null;
  const mark = readTagMark(tag, color);
  if (mark === null) return null;
  if (mark.isFail()) return Result.fail(mark.getError());
  const inner = readSpan(source.slice(at + written.length, closing), addMark(marks, mark.getValue()));
  if (inner.isFail()) return Result.fail(inner.getError());
  return Result.ok({ consumed: closing + tag.length + 3 - at, nodes: inner.getValue() });
};

const readConstruct = (source: string, at: number, marks: readonly PageMark[]): ConstructReading => {
  switch (source[at]) {
    case '\n':
      return Result.ok({ consumed: 1, nodes: [{ type: 'hard_break' }] });
    case '<':
      return readTag(source, at, marks);
    case '`':
      return readCode(source, at, marks);
    case MARKDOWN_FORMULA_DELIMITER:
      return readFormula(source, at);
    case '[':
      return readLink(source, at, marks);
    default:
      return readPairedMark(source, at, marks);
  }
};

/** Un tramo de texto con las marcas que ya lo envuelven, leído de izquierda a derecha. */
const readSpan = (source: string, marks: readonly PageMark[]): Result<readonly InlineNode[], string> => {
  const nodes: InlineNode[] = [];
  let words = '';
  let at = 0;
  while (at < source.length) {
    const construct = isEscaped(source, at) ? null : readConstruct(source, at, marks);
    if (construct === null) {
      const literal = readLiteral(source, at);
      words += literal.character;
      at += literal.width;
      continue;
    }
    if (construct.isFail()) return Result.fail(construct.getError());
    if (words !== '') nodes.push(writeText(words, marks));
    words = '';
    nodes.push(...construct.getValue().nodes);
    at += construct.getValue().consumed;
  }
  if (words !== '') nodes.push(writeText(words, marks));
  return Result.ok(nodes);
};

const sameMarks = (first: InlineNode, second: InlineNode): boolean =>
  first.type === 'text' && second.type === 'text' && JSON.stringify(first.marks) === JSON.stringify(second.marks);

/** Dos textos seguidos con las mismas marcas son uno solo, como los guarda el editor. */
const joinNeighbouringTexts = (nodes: readonly InlineNode[]): InlineNode[] =>
  nodes.reduce<InlineNode[]>((joined, node) => {
    const previous = joined.at(-1);
    if (previous?.type === 'text' && node.type === 'text' && sameMarks(previous, node)) {
      joined[joined.length - 1] = { ...previous, text: previous.text + node.text };
      return joined;
    }
    joined.push(node);
    return joined;
  }, []);

/**
 * Lo que dice una línea escrita en Markdown, como lo guarda una página.
 *
 * Lee lo mismo que la página escribe al leerse: negrita, cursiva, código,
 * tachado, enlaces, menciones a páginas, personas y fechas. Un signo que nadie
 * cerró se queda como carácter; un enlace que la página no guardaría se
 * rechaza diciendo por qué, en vez de perderse.
 */
export const readMarkdownInline = (text: string): Result<InlineNode[], string> => {
  const read = readSpan(text.replaceAll('\r\n', '\n'), []);
  return read.isFail() ? Result.fail(read.getError()) : Result.ok(joinNeighbouringTexts(read.getValue()));
};
