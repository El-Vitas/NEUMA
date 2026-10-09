import type { IconName } from 'lucide-react/dynamic';
import { resolvePageAssetUrl } from '../../attachments/lib/pages.attachments.lib';
import { PAGE_EDITOR_EMOJIS } from '../../editor/text/constants/pages.editor.emoji.constants';
import { findEmojiCandidates } from '../../editor/text/lib/pages.editor.emoji.lib';
import type { PageEmojiEntry } from '../../editor/text/types/pages.editor.emoji.types';
import { foldPageLookingText } from '../../links/lib/pages.looking.lib';
import { PAGE_ICON_EMOJI_GRID_LIMIT } from '../constants/pages.icon.constants';
import { PAGE_ICON_SYMBOL_WORDS } from '../constants/pages.icon.symbol-words.constants';
import { PAGE_ICON_SYMBOL_NAME_SET, PAGE_ICON_SYMBOL_NAMES } from '../constants/pages.icon.symbols.constants';
import type { PageEmojiIcon, PageIcon, PageImageIcon, PageSymbolIcon } from '../types/pages.icon.types';

export const isPageEmojiIcon = (icon: PageIcon): icon is PageEmojiIcon => icon.kind === 'emoji';

export const isPageImageIcon = (icon: PageIcon): icon is PageImageIcon => icon.kind === 'image';

export const isPageSymbolIcon = (icon: PageIcon): icon is PageSymbolIcon => icon.kind === 'symbol';

export const resolvePageIconImageUrl = (icon: PageImageIcon): string => resolvePageAssetUrl(icon.assetId);

/** Only a symbol this product actually draws can be asked for; anything else is treated as no symbol at all. */
export const isOfferedPageIconSymbol = (name: string): name is IconName => PAGE_ICON_SYMBOL_NAME_SET.has(name);

const describePageIconSymbol = (name: string): string =>
  foldPageLookingText([name, ...(PAGE_ICON_SYMBOL_WORDS[name] ?? [])].join(' '));

/**
 * The symbols worth offering for what was typed.
 *
 * A symbol answers to its own name and to the words it stands for, so looking
 * for «proyecto» finds the ones a project is marked with rather than only the
 * one that happens to be spelled that way. Every match is handed back; how many
 * of them get drawn at once is the grid's business, not this one's.
 */
export const findPageIconSymbolNames = (query: string): readonly string[] => {
  const wanted = foldPageLookingText(query);
  if (wanted.length === 0) return PAGE_ICON_SYMBOL_NAMES;
  return PAGE_ICON_SYMBOL_NAMES.filter((name) => describePageIconSymbol(name).includes(wanted));
};

export const findPageIconEmojiOptions = (query: string): readonly PageEmojiEntry[] =>
  query.trim().length === 0 ? PAGE_EDITOR_EMOJIS.slice(0, PAGE_ICON_EMOJI_GRID_LIMIT) : findEmojiCandidates(query);

/** One symbol taken at random from everything on offer, for whoever would rather not choose. */
export const pickRandomPageIconSymbolName = (): string =>
  PAGE_ICON_SYMBOL_NAMES[Math.floor(Math.random() * PAGE_ICON_SYMBOL_NAMES.length)] ?? 'file-text';

export const pickRandomPageEmojiIcon = (): PageEmojiIcon => {
  const entry = PAGE_EDITOR_EMOJIS[Math.floor(Math.random() * PAGE_EDITOR_EMOJIS.length)];
  return { kind: 'emoji', value: entry?.character ?? '📄' };
};
