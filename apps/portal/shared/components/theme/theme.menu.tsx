'use client';

import { Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { THEME_CHOICES, THEME_ICONS } from '@/shared/constants/theme.constants';
import { useTheme } from '@/shared/hooks/use.theme.hook';
import { readThemeChoice } from '@/shared/lib/theme.lib';
import type { ThemeChoice } from '@/shared/types/theme.types';

interface IProps {
  readonly choice: ThemeChoice;
}

/** Lets the interface be read by day, by night, or however the system is set. */
export const ThemeMenu = ({ choice }: IProps) => {
  const t = useTranslations('theme');
  const theme = useTheme(choice);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Moon aria-hidden="true" className="size-4" />
        {t('label')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup onValueChange={(value) => theme.choose(readThemeChoice(value))} value={theme.choice}>
          {THEME_CHOICES.map((option) => {
            const Icon = THEME_ICONS[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon aria-hidden="true" className="size-4" />
                {t(option)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
