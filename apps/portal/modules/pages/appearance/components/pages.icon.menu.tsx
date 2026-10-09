'use client';

import { ImageIcon, Shuffle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { findPageIconEmojiOptions, findPageIconSymbolNames } from '../lib/pages.icon.lib';
import type { PageIconColor } from '../types/pages.icon.types';
import { PagesIconColorPicker } from './pages.icon.color.picker';
import { PagesIconSymbolsGrid } from './pages.icon.symbols.grid';

interface IProps {
  readonly hasIcon: boolean;
  readonly isPending: boolean;
  readonly onChooseEmoji: (value: string) => void;
  readonly onChooseSymbol: (name: string, color: PageIconColor) => void;
  readonly onRandomEmoji: () => void;
  readonly onRandomSymbol: (color: PageIconColor) => void;
  readonly onRemove: () => void;
  /** Omitted where the mark is too small for an uploaded picture to be legible. */
  readonly onUpload?: (file: File) => void;
  readonly symbolColor: PageIconColor;
}

export const PagesIconMenu = ({
  hasIcon,
  isPending,
  onChooseEmoji,
  onChooseSymbol,
  onRandomEmoji,
  onRandomSymbol,
  onRemove,
  onUpload,
  symbolColor,
}: IProps) => {
  const t = useTranslations('pages.icon');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('emoji');
  const [color, setColor] = useState<PageIconColor>(symbolColor);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const options = findPageIconEmojiOptions(query);
  const symbolNames = findPageIconSymbolNames(query);

  /** Random stays within the open tab: a symbol search should not yield an emoji. */
  const chooseAtRandom = (): void => (tab === 'emoji' ? onRandomEmoji() : onRandomSymbol(color));

  return (
    <div className="w-full min-w-0 space-y-3">
      <Tabs onValueChange={setTab} value={tab}>
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="emoji">
            {t('emojiTab')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="symbol">
            {t('symbolTab')}
          </TabsTrigger>
        </TabsList>
        <div className="mt-2 flex items-center gap-1">
          <label className="sr-only" htmlFor="page-icon-search">
            {t('search')}
          </label>
          <input
            className="min-w-0 flex-1 border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="page-icon-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search')}
            value={query}
          />
          <button
            aria-label={t('random')}
            className="grid size-11 shrink-0 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isPending}
            onClick={chooseAtRandom}
            title={t('random')}
            type="button"
          >
            <Shuffle aria-hidden="true" className="size-4" />
          </button>
          <PagesIconColorPicker onChoose={setColor} selected={color} />
        </div>
        <TabsContent value="emoji">
          {options.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">{t('noMatches')}</p>
          ) : (
            <fieldset
              aria-label={t('chooseEmoji')}
              className="mt-2 grid max-h-48 w-full grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 overflow-y-auto border-0 p-0"
            >
              {options.map((entry) => (
                <button
                  aria-label={entry.names[0] ?? entry.character}
                  className="flex aspect-square min-h-11 w-full items-center justify-center text-xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={entry.character}
                  onClick={() => onChooseEmoji(entry.character)}
                  type="button"
                >
                  {entry.character}
                </button>
              ))}
            </fieldset>
          )}
        </TabsContent>
        <TabsContent value="symbol">
          {symbolNames.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">{t('noMatches')}</p>
          ) : (
            <PagesIconSymbolsGrid
              color={color}
              key={query}
              names={symbolNames}
              onChoose={(name) => onChooseSymbol(name, color)}
            />
          )}
        </TabsContent>
      </Tabs>
      <div className="flex flex-col gap-1 border-border border-t pt-3">
        {onUpload !== undefined && (
          <>
            <input
              accept="image/*"
              aria-label={t('uploadImage')}
              className="sr-only"
              disabled={isPending}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file !== undefined) onUpload(file);
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="flex min-h-11 items-center gap-2 px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <ImageIcon aria-hidden="true" className="size-4" />
              {t('uploadImage')}
            </button>
          </>
        )}
        {hasIcon && (
          <button
            className="flex min-h-11 items-center gap-2 px-2 text-left text-destructive text-sm hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={isPending}
            onClick={onRemove}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t('remove')}
          </button>
        )}
      </div>
    </div>
  );
};
