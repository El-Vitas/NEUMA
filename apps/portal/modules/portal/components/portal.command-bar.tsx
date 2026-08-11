'use client';

import { Home, Search } from 'lucide-react';
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
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export const PortalCommandBar = ({ onOpenChange, open }: IProps) => {
  const router = useRouter();
  const t = useTranslations('navigation');
  const [query, setQuery] = useState('');

  const navigate = (href: string): void => {
    onOpenChange(false);
    router.push(href);
  };

  const search = (): void => {
    const normalizedQuery = query.trim();
    navigate(
      normalizedQuery === ''
        ? ROUTES.PORTAL_SEARCH
        : `${ROUTES.PORTAL_SEARCH}?query=${encodeURIComponent(normalizedQuery)}`,
    );
  };

  return (
    <CommandDialog
      description={t('search')}
      onOpenChange={onOpenChange}
      open={open}
      showCloseButton={false}
      title={t('search')}
    >
      <CommandInput
        aria-label={t('search')}
        autoFocus
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || query.trim() === '') return;
          event.preventDefault();
          search();
        }}
        onValueChange={setQuery}
        placeholder={t('search')}
        value={query}
      />
      <CommandList>
        <CommandEmpty>{t('search')}</CommandEmpty>
        <CommandGroup heading={t('general')}>
          {query.trim() !== '' && (
            <CommandItem onSelect={search} value={`search ${query}`}>
              <Search aria-hidden="true" />
              {t('search')}: {query}
            </CommandItem>
          )}
          <CommandItem onSelect={() => navigate(ROUTES.PORTAL)}>
            <Home aria-hidden="true" />
            {t('home')}
          </CommandItem>
          <CommandItem onSelect={() => navigate(ROUTES.PORTAL_SEARCH)}>
            <Search aria-hidden="true" />
            {t('search')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
