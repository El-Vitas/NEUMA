// clean-comments
// Flags comments that cost reading time without paying it back: too long, not in English,
// telling history or process, commented-out code, bare TODOs, JSDoc that restates the types,
// and decoration. What a good comment says is in .agents/skills/code-comments/SKILL.md.

const DEFAULT_MAX_LINES = 5;
/** Matches the formatter's line width; Biome does not wrap comments, so a long one stays long. */
const DEFAULT_MAX_LINE_LENGTH = 120;
const URL = /https?:\/\//;

const TOOL_DIRECTIVE =
  /^\s*(eslint|biome-ignore|@ts-|istanbul|c8 |v8 |prettier-ignore|webpack|global |jshint|<reference)/;

const SPANISH_LETTERS = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
const SPANISH_WORDS = new Set([
  'que',
  'los',
  'las',
  'una',
  'uno',
  'para',
  'del',
  'por',
  'con',
  'como',
  'pero',
  'porque',
  'cuando',
  'donde',
  'esta',
  'este',
  'esto',
  'sin',
  'hay',
  'sus',
  'pagina',
  'paginas',
  'se',
  'lo',
  'el',
  'la',
  'puede',
  'tiene',
  'solo',
  'cada',
  'otra',
  'otro',
  'nada',
  'algo',
  'ya',
  'mas',
  'agente',
  'quien',
]);
const SPANISH_WORDS_TO_BE_SURE = 3;

const HISTORY_OR_PROCESS =
  /\b(previously|formerly|as requested|per (the )?review|code review|quality (pass|sweep)|sonarqube|sonar rule|jscpd|react-doctor)\b/i;

const CODE_START =
  /^(import |export |const |let |var |return\b|if \(|for \(|while \(|await |throw |console\.|this\.|\}|[\w$.[\]]+\s*=[^=])/;
const CODE_END = /[;{}]\s*$/;
const CALL_STATEMENT = /^[\w$.]+\(.*\);\s*$/;

const BARE_TODO = /\b(TODO|FIXME|XXX|HACK)\b(?!\([A-Z][A-Z0-9]*-\d+\))/;

const JSDOC_TYPE_BRACES = /@(param|returns?|type)\s+\{/;
const JSDOC_EMPTY_TAG = /^@(param\s+[\w$.[\]]+|returns?)\s*$/;

const DECORATION = /[-=*#_~/]{5,}/;

const EXAMPLE_BLOCK = /@example|```/;

/** The comment's text split into its lines, without the `*` gutter of a block comment. */
const readLines = (comment) =>
  comment.value
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trimEnd())
    .filter((line) => line.trim().length > 0);

const isToolDirective = (comment) => TOOL_DIRECTIVE.test(comment.value.replace(/^\s*\*?/, ''));

const countSpanishWords = (text) =>
  text
    .toLowerCase()
    .split(/[^a-záéíóúñ]+/)
    .filter((word) => SPANISH_WORDS.has(word)).length;

const isSpanish = (text) => SPANISH_LETTERS.test(text) || countSpanishWords(text) >= SPANISH_WORDS_TO_BE_SURE;

const looksLikeCode = (line) => {
  const trimmed = line.trim();
  if (CALL_STATEMENT.test(trimmed)) return true;
  return CODE_START.test(trimmed) && CODE_END.test(trimmed);
};

const hasRedundantJsdoc = (comment, lines) =>
  comment.type === 'Block' &&
  comment.value.startsWith('*') &&
  lines.some((line) => JSDOC_TYPE_BRACES.test(line) || JSDOC_EMPTY_TAG.test(line.trim()));

/**
 * Consecutive `//` lines read as one comment, so their length is counted together. A line comment
 * joins the previous one when it starts on the next line, in the same column.
 */
const groupComments = (comments) => {
  const groups = [];
  for (const comment of comments) {
    const previous = groups.at(-1)?.at(-1);
    const continuesPrevious =
      previous !== undefined &&
      previous.type === 'Line' &&
      comment.type === 'Line' &&
      comment.loc.start.line === previous.loc.end.line + 1 &&
      comment.loc.start.column === previous.loc.start.column;
    if (continuesPrevious) groups.at(-1).push(comment);
    else groups.push([comment]);
  }
  return groups;
};

const checkLength = (group, maxLines, report) => {
  const lineCount = group.reduce((total, comment) => total + readLines(comment).length, 0);
  if (lineCount > maxLines) report(group[0], 'tooLong', { lines: lineCount, max: maxLines });
};

/** A comment squeezed onto one wide line is as long as the lines it replaced, so width counts too. */
const checkLineWidth = (comment, sourceLines, maxLineLength, report) => {
  for (let line = comment.loc.start.line; line <= comment.loc.end.line; line += 1) {
    const text = sourceLines[line - 1] ?? '';
    if (text.length > maxLineLength && !URL.test(text)) {
      report(comment, 'lineTooLong', {
        length: text.length,
        max: maxLineLength,
      });
      return;
    }
  }
};

const checkComment = (comment, report) => {
  const lines = readLines(comment);
  const text = lines.join(' ');
  if (isSpanish(text)) report(comment, 'notEnglish');
  if (isToolDirective(comment)) return;
  if (HISTORY_OR_PROCESS.test(text)) report(comment, 'history');
  if (BARE_TODO.test(text)) report(comment, 'bareTodo');
  if (lines.some((line) => DECORATION.test(line))) report(comment, 'decoration');
  if (hasRedundantJsdoc(comment, lines)) report(comment, 'redundantJsdoc');
  const isExample = EXAMPLE_BLOCK.test(comment.value);
  if (!isExample && lines.length > 0 && lines.every(looksLikeCode)) report(comment, 'commentedCode');
};

export const cleanComments = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'keep comments short, in English, and about why the code is the way it is',
    },
    messages: {
      tooLong:
        'Este comentario tiene {{lines}} líneas y el máximo es {{max}}. Deja solo el porqué; lo extenso va a docs/ o a una regla de negocio.',
      notEnglish: 'Los comentarios van en inglés, como los identificadores.',
      history:
        'El comentario cuenta historia o proceso. Eso va en el commit; el comentario dice por qué el código es así hoy.',
      commentedCode: 'Código comentado: bórralo, git lo conserva.',
      bareTodo: 'Un TODO lleva su ticket: TODO(TICKET-123): lo que falta. Si no hay ticket, bórralo o créalo.',
      redundantJsdoc:
        'El JSDoc repite lo que el tipo ya dice: sin {tipos} y sin @param o @returns que no agreguen información.',
      decoration: 'Los separadores y banners no explican nada: bórralos.',
      lineTooLong:
        'Esta línea de comentario mide {{length}} columnas y el máximo es {{max}}. Acórtalo; no lo comprimas en una línea ancha.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxLineLength: { type: 'integer', minimum: 20 },
          maxLines: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const maxLines = context.options[0]?.maxLines ?? DEFAULT_MAX_LINES;
    const maxLineLength = context.options[0]?.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH;
    const sourceLines = context.sourceCode.lines;
    const report = (comment, messageId, data) => context.report({ data, loc: comment.loc, messageId });
    return {
      Program: () => {
        const comments = context.sourceCode.getAllComments().filter((comment) => comment.type !== 'Shebang');
        for (const group of groupComments(comments)) {
          if (!group.every(isToolDirective)) checkLength(group, maxLines, report);
          for (const comment of group) {
            checkComment(comment, report);
            if (!isToolDirective(comment)) checkLineWidth(comment, sourceLines, maxLineLength, report);
          }
        }
      },
    };
  },
};
