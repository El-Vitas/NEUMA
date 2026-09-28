'use client';

import { ChevronsUpDown, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/shared/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ACCESS_TOKEN_PAGE_SEARCH_MESSAGE_KEYS } from '../constants/access-tokens.constants';
import { useAccessTokensPageSearch } from '../hooks/use.access-tokens.page-search';
import { excludePageOptions, readPageSearchState } from '../lib/access-tokens.lib';
import type { AccessTokenPageOption } from '../types/access-tokens.types';

interface IProps {
  readonly excludedPageIds: readonly string[];
  readonly labelId: string;
  readonly onChoose: (page: AccessTokenPageOption) => void;
  readonly page: AccessTokenPageOption | null;
}

/**
 * Elegir una página escribiendo su nombre. Solo aparecen las que encuentra la
 * búsqueda de quien crea el token, que ya son las que ve; las que otra fila
 * nombró no se ofrecen de nuevo.
 */
export const AccessTokensPagePicker = ({ excludedPageIds, labelId, onChoose, page }: IProps) => {
  const t = useTranslations('accessTokens.form');
  const valueId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useAccessTokensPageSearch(query);
  const offered = excludePageOptions(search.pages, excludedPageIds);
  const state = readPageSearchState(query, search, offered);

  const choose = (chosen: AccessTokenPageOption): void => {
    onChoose(chosen);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger
        aria-labelledby={`${labelId} ${valueId}`}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 border border-border bg-background px-3 text-left text-sm',
          FOCUS_RING_CLASS,
        )}
      >
        <span className={cn('min-w-0 truncate', page === null && 'text-muted-foreground')} id={valueId}>
          {page === null ? t('choosePage') : page.title}
          {page !== null && <span className="text-muted-foreground"> · {page.spaceName}</span>}
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            aria-label={t('pageSearchPlaceholder')}
            onValueChange={setQuery}
            placeholder={t('pageSearchPlaceholder')}
            value={query}
          />
          <CommandList aria-busy={search.isSearching} label={t('pageSearchResults')}>
            <CommandEmpty>{t(ACCESS_TOKEN_PAGE_SEARCH_MESSAGE_KEYS[state])}</CommandEmpty>
            {offered.map((option) => (
              <CommandItem key={option.id} onSelect={() => choose(option)} value={option.id}>
                <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{option.title}</span>
                <span className="ml-auto shrink-0 text-muted-foreground text-xs">{option.spaceName}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
