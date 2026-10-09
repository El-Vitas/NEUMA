import { MCP_DIAGRAM_BUILT_IN_ICONS, MCP_ICON_NAME_SEPARATORS } from '../constants/mcp.constants';
import type { McpIconPack, McpRankedIcon } from '../types/mcp.pages.types';
import { foldMcpName } from './mcp.columns.lib';

/** Qué tan bien calza un nombre: igual a lo buscado, igual a una palabra, empieza por una, o solo la contiene. */
const rankName = (name: string, matched: readonly string[], wanted: string): number => {
  if (name === wanted) return 0;
  if (matched.includes(name)) return 1;
  return matched.some((word) => name.startsWith(word)) ? 2 : 3;
};

/** Cuántas de las palabras buscadas tiene un nombre y qué tan bien calza; nada si no tiene ninguna. */
const rankIcon = (
  name: string,
  words: readonly string[],
  wanted: string,
): Pick<McpRankedIcon, 'matchedWords' | 'rank'> | null => {
  const matched = words.filter((word) => name.includes(word));
  return matched.length === 0 ? null : { matchedWords: matched.length, rank: rankName(name, matched, wanted) };
};

const compareIcons = (first: McpRankedIcon, second: McpRankedIcon): number =>
  second.matchedWords - first.matchedWords || first.rank - second.rank || first.name.length - second.name.length;

const listNames = (pack: McpIconPack): readonly string[] => [
  ...Object.keys(pack.icons),
  ...Object.keys(pack.aliases ?? {}),
];

/** Si un ícono, escrito como `paquete:ícono` o como uno propio de Mermaid, está entre los que el portal sabe dibujar. */
export const hasMcpDiagramIcon = (packs: readonly McpIconPack[], icon: string): boolean => {
  if (!icon.includes(':')) return MCP_DIAGRAM_BUILT_IN_ICONS.includes(icon);
  const [prefix, name] = icon.split(':');
  const pack = packs.find((candidate) => candidate.prefix === prefix);
  if (pack === undefined || name === undefined) return false;
  return Object.hasOwn(pack.icons, name) || Object.hasOwn(pack.aliases ?? {}, name);
};

/**
 * Los íconos que un diagrama puede usar y que responden a lo buscado, escritos
 * como el diagrama los nombra: `paquete:ícono`. Basta con una de las palabras,
 * porque quien busca suele describir la idea con varias y ningún ícono las
 * tiene todas. Primero los que tienen más palabras; entre ellos, el que se
 * llama igual, después los que empiezan así y al final los que solo la contienen.
 */
export const searchMcpDiagramIcons = (packs: readonly McpIconPack[], query: string, limit: number): string[] => {
  const words = foldMcpName(query)
    .split(MCP_ICON_NAME_SEPARATORS)
    .filter((word) => word !== '');
  if (words.length === 0) return [];
  const wanted = words.join('-');
  const ranked: McpRankedIcon[] = packs.flatMap((pack) =>
    listNames(pack).flatMap((name) => {
      const ranking = rankIcon(name, words, wanted);
      return ranking === null ? [] : [{ ...ranking, name: `${pack.prefix}:${name}` }];
    }),
  );
  return ranked
    .toSorted(compareIcons)
    .slice(0, limit)
    .map((icon) => icon.name);
};
