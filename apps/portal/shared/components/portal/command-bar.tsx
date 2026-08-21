'use client';

import { Boxes, FilePlus, History, Home, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import { useCommandBarSearch } from '@/shared/hooks/use.command-bar-search.hook';
import { usePagesStart } from '@/shared/hooks/use.pages-start.hook';
import { useRecentPages } from '@/shared/hooks/use.recents-storage.hook';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export const PortalCommandBar = ({ onOpenChange, open }: IProps) => {
  const router = useRouter();
  const t = useTranslations('portal.finder');
  const navigationT = useTranslations('navigation');
  const pagesT = useTranslations('pages');
  const [query, setQuery] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  const { recentPages, refresh } = useRecentPages();
  const { startPage } = usePagesStart();
  const { isLoading, pages } = useCommandBarSearch(query);

  /**
   * Opening asks the recent pages to catch up with whatever changed while
   * this was closed; closing lets go of what was typed. Told apart from the
   * render already under way rather than through an effect, since neither
   * needs anything an effect alone could reach.
   */
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) refresh();
    else setQuery('');
  }

  const navigate = (href: string): void => {
    onOpenChange(false);
    router.push(href);
  };

  const trimmedQuery = query.trim();
  const mostRecentSpaceId = recentPages[0]?.spaceId;

  /** With a space already in mind the page is started there; without one, there is a space to pick first. */
  const startPageFromFinder = (): void => {
    onOpenChange(false);
    if (mostRecentSpaceId === undefined) {
      router.push(ROUTES.PORTAL_SPACES);
      return;
    }
    startPage(mostRecentSpaceId);
  };

  return (
    <CommandDialog
      description={t('label')}
      onOpenChange={onOpenChange}
      open={open}
      showCloseButton={false}
      title={t('label')}
    >
      <CommandInput
        aria-label={t('label')}
        autoFocus
        onValueChange={setQuery}
        placeholder={t('placeholder')}
        value={query}
      />
      <CommandList>
        <CommandEmpty>{isLoading ? pagesT('searchingMentionCandidates') : t('empty')}</CommandEmpty>

        {trimmedQuery === '' && recentPages.length > 0 && (
          <CommandGroup heading={t('recentGroup')}>
            {recentPages.map((entry) => (
              <CommandItem
                key={entry.pageId}
                onSelect={() => navigate(ROUTES.PORTAL_SPACE_PAGE(entry.spaceId, entry.pageId))}
                value={`recent ${entry.title}`}
              >
                <History aria-hidden="true" />
                {entry.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {trimmedQuery !== '' && (
          <CommandGroup heading={t('pagesGroup')}>
            <CommandItem
              onSelect={() => navigate(`${ROUTES.PORTAL_SEARCH}?query=${encodeURIComponent(trimmedQuery)}`)}
              value={`search ${trimmedQuery}`}
            >
              <Search aria-hidden="true" />
              {navigationT('search')}: {trimmedQuery}
            </CommandItem>
            {pages.map((page) => (
              <CommandItem
                key={page.id}
                onSelect={() => navigate(ROUTES.PORTAL_SPACE_PAGE(page.spaceId, page.id))}
                value={`page ${page.title}`}
              >
                <Search aria-hidden="true" />
                {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading={t('actionsGroup')}>
          <CommandItem onSelect={startPageFromFinder} value={`action create-page ${t('actions.createPage')}`}>
            <FilePlus aria-hidden="true" />
            {t('actions.createPage')}
          </CommandItem>
          <CommandItem
            onSelect={() => navigate(ROUTES.PORTAL_SPACES)}
            value={`action go-to-space ${t('actions.goToSpace')}`}
          >
            <Boxes aria-hidden="true" />
            {t('actions.goToSpace')}
          </CommandItem>
          <CommandItem
            onSelect={() => navigate(ROUTES.PORTAL_TRASH)}
            value={`action open-trash ${t('actions.openTrash')}`}
          >
            <Trash2 aria-hidden="true" />
            {t('actions.openTrash')}
          </CommandItem>
          <CommandItem onSelect={() => navigate(ROUTES.PORTAL)} value={`action go-home ${t('actions.goHome')}`}>
            <Home aria-hidden="true" />
            {t('actions.goHome')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <p className="border-t px-3 py-2 text-muted-foreground text-xs">{t('keyboardHelp')}</p>
    </CommandDialog>
  );
};
