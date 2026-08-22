'use client';

import { Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  PAGE_APPEARANCE_TEXT_SIZE_VALUES,
  PAGE_APPEARANCE_TYPOGRAPHY_VALUES,
} from '../constants/pages.appearance.constants';
import { isPageAppearanceTextSize, isPageAppearanceTypography } from '../lib/pages.appearance.lib';
import type {
  PageAppearancePreferences,
  PageAppearanceTextSize,
  PageAppearanceTypography,
} from '../types/pages.appearance.types';

interface IProps {
  readonly onTextSizeChange: (textSize: PageAppearanceTextSize) => void;
  readonly onTypographyChange: (typography: PageAppearanceTypography) => void;
  readonly preferences: PageAppearancePreferences;
}

/**
 * How a page looks to whoever is reading it, kept apart from what it holds.
 *
 * Every choice here is stored per page, never for the whole product, so what
 * is chosen for one page never leaks into another.
 */
export const PagesAppearanceMenu = ({ onTextSizeChange, onTypographyChange, preferences }: IProps) => {
  const t = useTranslations('pages.appearance');

  const chooseTextSize = (value: string): void => {
    if (isPageAppearanceTextSize(value)) onTextSizeChange(value);
  };

  const chooseTypography = (value: string): void => {
    if (isPageAppearanceTypography(value)) onTypographyChange(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('title')}
          className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <Type aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('textSize')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={chooseTextSize} value={preferences.textSize}>
          {PAGE_APPEARANCE_TEXT_SIZE_VALUES.map((textSize) => (
            <DropdownMenuRadioItem key={textSize} value={textSize}>
              {t(`textSizeOptions.${textSize}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('typography')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={chooseTypography} value={preferences.typography}>
          {PAGE_APPEARANCE_TYPOGRAPHY_VALUES.map((typography) => (
            <DropdownMenuRadioItem key={typography} value={typography}>
              {t(`typographyOptions.${typography}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-muted-foreground text-xs">{t('scopeNote')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
