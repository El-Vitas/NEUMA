import { MCP_DIAGRAM_BUILT_IN_ICONS, MCP_ICON_NAME_SEPARATORS } from '../constants/mcp.constants';
import type { McpIconPack, McpRankedIcon } from '../types/mcp.pages.types';
import { foldMcpName } from './mcp.columns.lib';

/** Lower is better: exact query, exact word, word prefix, then contains. */
const rankName = (name: string, matched: readonly string[], wanted: string): number => {
  if (name === wanted) return 0;
  if (matched.includes(name)) return 1;
  return matched.some((word) => name.startsWith(word)) ? 2 : 3;
};

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

export const hasMcpDiagramIcon = (packs: readonly McpIconPack[], icon: string): boolean => {
  if (!icon.includes(':')) return MCP_DIAGRAM_BUILT_IN_ICONS.includes(icon);
  const [prefix, name] = icon.split(':');
  const pack = packs.find((candidate) => candidate.prefix === prefix);
  if (pack === undefined || name === undefined) return false;
  return Object.hasOwn(pack.icons, name) || Object.hasOwn(pack.aliases ?? {}, name);
};

/** One matching word is enough: no icon has every word of a described idea. Most matches first, then name rank. */
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
