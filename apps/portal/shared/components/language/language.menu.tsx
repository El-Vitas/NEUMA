'use client';

import { Languages } from 'lucide-react';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { LANGUAGE_CHOICES, LANGUAGE_NAMES } from '@/shared/constants/language.constants';

/**
 * Lets the interface be read in another language, staying on the same page.
 *
 * Each language is named in itself, so it can be recognised by someone who
 * cannot read the one currently on screen.
 */
export const LanguageMenu = () => {
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages aria-hidden="true" className="size-4" />
        {t('label')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup onValueChange={(value) => router.replace(pathname, { locale: value })} value={locale}>
          {LANGUAGE_CHOICES.map((choice) => (
            <DropdownMenuRadioItem key={choice} value={choice}>
              {LANGUAGE_NAMES[choice] ?? choice}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
