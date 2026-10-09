import { z } from 'zod';
import {
  MARKDOWN_AMOUNT_AFTER_DOLLAR,
  MARKDOWN_DATE_TARGET,
  MARKDOWN_ESCAPABLE_CHARACTERS,
  MARKDOWN_FORMULA_DELIMITER,
  MARKDOWN_MAX_NESTING,
  MARKDOWN_PAGE_PATH_PATTERN,
  MARKDOWN_PAIRED_MARKS,
  MARKDOWN_PERSON_PREFIX,
  MARKDOWN_PERSON_TARGET,
  MARKDOWN_TAG_MARKS,
  MARKDOWN_TAG_OPENING,
  MARKDOWN_TAG_OPENING_MAX_LENGTH,
} from './constants/page-markdown.constants.js';
import { Result } from './result.js';
import { isOneOf } from './value-list.lib.js';
import {
  isPageCalendarDay,
  isPageLinkTarget,
  PAGE_BLOCK_COLORS,
  PAGE_TEXT_MARKS_MOST,
  PAGE_TEXT_TAG_PATTERN,
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

/** Lo que se sabe de un tramo mientras se lee, para no volver a recorrerlo entero por cada signo. */
interface InlineReading {
  /** Cada corchete que abre, con el que lo cierra. */
  readonly brackets: ReadonlyMap<number, number>;
  /** Cuán dentro de otros enlaces y marcas va este tramo. */
  readonly depth: number;
  /** Para cada posición, si va escapada. */
  readonly escaped: readonly boolean[];
  /** Cada paréntesis que abre, con el que lo cierra. */
  readonly parentheses: ReadonlyMap<number, number>;
  /** Para cada signo, desde dónde ya se sabe que no cierra. */
  readonly unclosedFrom: Map<string, number>;
}

const personIdSchema = z.uuid();

const writeText = (text: string, marks: readonly PageMark[]): InlineNode =>
  marks.length === 0 ? { text, type: 'text' } : { marks: [...marks], text, type: 'text' };

const addMark = (marks: readonly PageMark[], mark: PageMark): readonly PageMark[] =>
  marks.some((carried) => carried.type === mark.type) ? marks : [...marks, mark];

/**
 * Qué posiciones van escapadas: las que tienen un número impar de barras
 * delante, porque dos barras son una barra escrita. Se marcan de una pasada;
 * contar las barras hacia atrás en cada posición tardaría el cuadrado de una
 * tanda larga de barras. Se recorre por unidad y no por carácter, para que la
 * posición calce con la del texto aunque haya emojis.
 */
const markEscapedPositions = (source: string): readonly boolean[] => {
  const escaped: boolean[] = [];
  let backslashesBefore = 0;
  for (const unit of source.split('')) {
    escaped.push(backslashesBefore % 2 === 1);
    backslashesBefore = unit === '\\' ? backslashesBefore + 1 : 0;
  }
  return escaped;
};

const isEscaped = (escaped: readonly boolean[], at: number): boolean => escaped.at(at) === true;

/** Un carácter tal cual, o el que va después de una barra que lo escapa. */
const readLiteral = (source: string, at: number): { readonly character: string; readonly width: number } => {
  const next = source.charAt(at + 1);
  if (source.charAt(at) === '\\' && MARKDOWN_ESCAPABLE_CHARACTERS.includes(next)) return { character: next, width: 2 };
  return { character: source.charAt(at), width: 1 };
};

/** Dónde cierra un signo que se abrió: el primero que no está escapado, no va tras un espacio ni pegado a otro igual. */
const findClosing = (source: string, reading: InlineReading, delimiter: string, from: number): number => {
  for (let at = source.indexOf(delimiter, from); at !== -1; at = source.indexOf(delimiter, at + 1)) {
    const isGluedToAnother = source[at + delimiter.length] === delimiter[0];
    const followsSpace = source[at - 1] === ' ';
    if (at > from && !isGluedToAnother && !followsSpace && !isEscaped(reading.escaped, at)) return at;
  }
  return -1;
};

/**
 * Busca dónde cierra un signo recordando dónde ya no se encontró: si desde un
 * punto no hay cierre, tampoco lo hay desde uno más adelante. Sin eso, un
 * texto lleno de signos que no cierran se recorre entero una vez por signo.
 */
const findClosingOnce = (reading: InlineReading, sign: string, from: number, find: () => number): number => {
  const unclosedFrom = reading.unclosedFrom.get(sign);
  if (unclosedFrom !== undefined && unclosedFrom <= from) return -1;
  const closing = find();
  if (closing === -1) reading.unclosedFrom.set(sign, Math.min(unclosedFrom ?? from, from));
  return closing;
};

/**
 * Cada corchete o paréntesis que abre, con el que lo cierra, contando los que
 * se abren dentro. Se arma de una sola pasada con una pila: buscarlo de nuevo
 * para cada signo que no cierra tardaría el cuadrado del largo del texto.
 */
const pairBrackets = (
  source: string,
  escaped: readonly boolean[],
  open: string,
  close: string,
): ReadonlyMap<number, number> => {
  const pairs = new Map<number, number>();
  const opened: number[] = [];
  for (let at = 0; at < source.length; at += 1) {
    if (isEscaped(escaped, at)) continue;
    if (source[at] === open) opened.push(at);
    const start = source[at] === close ? opened.pop() : undefined;
    if (start !== undefined) pairs.set(start, at);
  }
  return pairs;
};

/** Lo que se sabe de un tramo mientras se lee: sus corchetes ya emparejados, lo que no cierra y cuán hondo va. */
const startReading = (source: string, depth: number): InlineReading => {
  const escaped = markEscapedPositions(source);
  return {
    brackets: pairBrackets(source, escaped, '[', ']'),
    depth,
    escaped,
    parentheses: pairBrackets(source, escaped, '(', ')'),
    unclosedFrom: new Map(),
  };
};

/**
 * La página de Company Brain a la que lleva una dirección, con o sin dominio e
 * idioma delante, o nada si lleva a otra parte. Un enlace así nombra la página
 * por su id: quien muestra lo que dice una página lo usa para no nombrar las
 * que el lector no ve.
 */
export const readPageLinkAddress = (href: string): { readonly pageId: string; readonly spaceId: string } | null => {
  const trimmed = href.trim();
  const path = URL.canParse(trimmed) ? new URL(trimmed).pathname : trimmed;
  const page = MARKDOWN_PAGE_PATH_PATTERN.exec(path);
  if (page === null) return null;
  const [, spaceId, pageId] = page;
  return { pageId, spaceId };
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
  depth: number,
): Result<readonly InlineNode[], string> => {
  if (target.startsWith(MARKDOWN_PERSON_TARGET)) return readPerson(label, target);
  if (target.startsWith(MARKDOWN_DATE_TARGET)) return readDate(target);
  const page = readPageLinkAddress(target);
  if (page !== null) return Result.ok([{ attrs: { label, ...page }, type: 'mention' }]);
  if (!isPageLinkTarget(target))
    return Result.fail(`"${target}" is not a link a page can keep: use an http, https or mailto address.`);
  return readSpan(label, addMark(marks, { attrs: { href: target }, type: 'link' }), depth + 1);
};

const readLink = (source: string, at: number, marks: readonly PageMark[], reading: InlineReading): ConstructReading => {
  const labelEnd = reading.brackets.get(at);
  if (labelEnd === undefined || source[labelEnd + 1] !== '(') return null;
  const targetEnd = reading.parentheses.get(labelEnd + 1);
  if (targetEnd === undefined) return null;
  const label = source.slice(at + 1, labelEnd);
  const nodes = readLinkTarget(label, source.slice(labelEnd + 2, targetEnd).trim(), marks, reading.depth);
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
const readPairedMark = (
  source: string,
  at: number,
  marks: readonly PageMark[],
  reading: InlineReading,
): ConstructReading => {
  const paired = MARKDOWN_PAIRED_MARKS.find(({ delimiter }) => source.startsWith(delimiter, at));
  if (paired === undefined) return null;
  const { delimiter } = paired;
  const start = at + delimiter.length;
  const opensWords = source.charAt(start) !== '' && source.charAt(start) !== ' ';
  const closing = opensWords
    ? findClosingOnce(reading, delimiter, start, () => findClosing(source, reading, delimiter, start))
    : -1;
  if (closing === -1) return null;
  const inner = readSpan(source.slice(start, closing), addMark(marks, { type: paired.mark }), reading.depth + 1);
  if (inner.isFail()) return Result.fail(inner.getError());
  return Result.ok({ consumed: closing + delimiter.length - at, nodes: inner.getValue() });
};

/** Dónde cierra una fórmula: un signo pegado a lo último que dice, y que no va seguido de un número. */
const findFormulaEnd = (source: string, reading: InlineReading, from: number): number => {
  for (
    let at = source.indexOf(MARKDOWN_FORMULA_DELIMITER, from);
    at !== -1;
    at = source.indexOf(MARKDOWN_FORMULA_DELIMITER, at + 1)
  ) {
    const followsSpace = source.charAt(at - 1) === ' ';
    const opensAnAmount = MARKDOWN_AMOUNT_AFTER_DOLLAR.test(source.charAt(at + 1));
    if (at > from && !followsSpace && !opensAnAmount && !isEscaped(reading.escaped, at)) return at;
  }
  return -1;
};

/** Una fórmula entre signos de dólar, si lo es: un precio suelto se queda como texto. */
const readFormula = (source: string, at: number, reading: InlineReading): ConstructReading => {
  const first = source.charAt(at + 1);
  if (first === '' || first === ' ') return null;
  const closing = findClosingOnce(reading, MARKDOWN_FORMULA_DELIMITER, at + 1, () =>
    findFormulaEnd(source, reading, at + 1),
  );
  if (closing === -1) return null;
  return Result.ok({
    consumed: closing + 1 - at,
    nodes: [{ attrs: { latex: source.slice(at + 1, closing) }, type: 'formula' }],
  });
};

const isPageColor = (color: string): color is PageBlockColor => isOneOf(PAGE_BLOCK_COLORS, color);

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

/**
 * Subrayado, color de texto o resaltado escritos como su etiqueta de HTML;
 * otra etiqueta, o una sin cerrar, es texto. Se mira solo lo que puede medir
 * una etiqueta, no el resto del texto.
 */
const readTag = (source: string, at: number, marks: readonly PageMark[], reading: InlineReading): ConstructReading => {
  const opening = MARKDOWN_TAG_OPENING.exec(source.slice(at, at + MARKDOWN_TAG_OPENING_MAX_LENGTH));
  if (opening === null) return null;
  const [written, tag = '', color] = opening;
  const closingTag = `</${tag}>`;
  const closing = findClosingOnce(reading, closingTag, at + written.length, () =>
    source.indexOf(closingTag, at + written.length),
  );
  if (closing === -1) return null;
  const mark = readTagMark(tag, color);
  if (mark === null) return null;
  if (mark.isFail()) return Result.fail(mark.getError());
  const held = source.slice(at + written.length, closing);
  if (held.includes(`<${tag}`))
    return Result.fail(`A <${tag}> inside another <${tag}> is not kept: close the first one before opening the next.`);
  const inner = readSpan(held, addMark(marks, mark.getValue()), reading.depth + 1);
  if (inner.isFail()) return Result.fail(inner.getError());
  return Result.ok({ consumed: closing + closingTag.length - at, nodes: inner.getValue() });
};

const readConstruct = (
  source: string,
  at: number,
  marks: readonly PageMark[],
  reading: InlineReading,
): ConstructReading => {
  switch (source[at]) {
    case '\n':
      return Result.ok({ consumed: 1, nodes: [{ type: 'hard_break' }] });
    case '<':
      return readTag(source, at, marks, reading);
    case '`':
      return readCode(source, at, marks);
    case MARKDOWN_FORMULA_DELIMITER:
      return readFormula(source, at, reading);
    case '[':
      return readLink(source, at, marks, reading);
    default:
      return readPairedMark(source, at, marks, reading);
  }
};

/**
 * Un tramo de texto con las marcas que ya lo envuelven, leído de izquierda a
 * derecha. Lo que va dentro de un enlace o de una marca se lee un nivel más
 * hondo; pasado el tope se rechaza, en vez de agotar la pila.
 */
const readSpan = (source: string, marks: readonly PageMark[], depth: number): Result<readonly InlineNode[], string> => {
  if (depth > MARKDOWN_MAX_NESTING)
    return Result.fail(
      `The text puts links or marks more than ${String(MARKDOWN_MAX_NESTING)} deep inside each other: write it plainer.`,
    );
  const reading = startReading(source, depth);
  const nodes: InlineNode[] = [];
  let words = '';
  let at = 0;
  while (at < source.length) {
    const construct = isEscaped(reading.escaped, at) ? null : readConstruct(source, at, marks, reading);
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

/** Por qué la página no guardaría estas palabras, o nada si las guarda. */
const explainUnstorableText = (node: InlineNode): string | null => {
  if (node.type !== 'text') return null;
  const tag = PAGE_TEXT_TAG_PATTERN.exec(node.text)?.[0];
  if (tag !== undefined)
    return `"${tag}" is an HTML tag, and a page never keeps tags, not even inside code. Use Markdown for styles, or name the tag without its angle brackets.`;
  if ((node.marks?.length ?? 0) > PAGE_TEXT_MARKS_MOST)
    return `"${node.text}" carries more than ${String(PAGE_TEXT_MARKS_MOST)} styles at once. Use fewer on the same words.`;
  return null;
};

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
 * rechaza diciendo por qué, en vez de perderse. Lo mismo unas palabras que la
 * página no guarda: una etiqueta HTML escrita tal cual, o demasiados estilos
 * sobre las mismas palabras.
 */
export const readMarkdownInline = (text: string): Result<InlineNode[], string> => {
  const read = readSpan(text.replaceAll('\r\n', '\n'), [], 0);
  if (read.isFail()) return Result.fail(read.getError());
  const nodes = joinNeighbouringTexts(read.getValue());
  const refusal = nodes.map(explainUnstorableText).find((explained) => explained !== null);
  return refusal === undefined ? Result.ok(nodes) : Result.fail(refusal);
};
