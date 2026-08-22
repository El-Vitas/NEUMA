'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageIconGlyph } from '@/shared/components/portal/page-icon-glyph';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { hasActionError, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import type { PageSummary } from '../../types/pages.types';
import {
  isPageImageIcon,
  isPageSymbolIcon,
  pickRandomPageEmojiIcon,
  pickRandomPageIconSymbolName,
} from '../lib/pages.icon.lib';
import {
  removePageIconAction,
  setPageIconEmojiAction,
  setPageIconSymbolAction,
  uploadPageIconImageAction,
} from '../server/actions/pages.icon.actions';
import type { PageIcon, PageIconColor } from '../types/pages.icon.types';
import { PagesIconDisplay } from './pages.icon.display';
import { PagesIconMenu } from './pages.icon.menu';

interface IProps {
  readonly canEdit: boolean;
  readonly icon: PageIcon | null;
  readonly onIconChange: (icon: PageIcon | null) => void;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}

export const PagesIconField = ({ canEdit, icon, onIconChange, pageId, spaceId, title }: IProps) => {
  const t = useTranslations('pages.icon');
  const tErrors = useTranslations('errors');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const previousAssetId = icon !== null && isPageImageIcon(icon) ? icon.assetId : undefined;
  const symbolColor: PageIconColor = icon !== null && isPageSymbolIcon(icon) ? icon.color : 'default';
  const accessibleLabel = icon === null ? t('add') : t('label', { name: title.length > 0 ? title : t('add') });

  const reportFailure = (result: unknown): void => {
    if (!hasActionError(result)) return;
    toast.error(tErrors(`reasons.${readActionFailureReason(result)}`));
  };

  const applyResult = (result: unknown): void => {
    if (isActionSuccess<PageSummary>(result)) {
      onIconChange(result.data.icon ?? null);
      return;
    }
    reportFailure(result);
  };

  const runIconMutation = (mutate: () => Promise<unknown>): void => {
    setIsMenuOpen(false);
    startTransition(async () => applyResult(await mutate()));
  };

  const chooseEmoji = (value: string): void =>
    runIconMutation(() => setPageIconEmojiAction({ pageId, spaceId, value }));

  const chooseSymbol = (name: string, color: PageIconColor): void =>
    runIconMutation(() => setPageIconSymbolAction({ color, name, pageId, spaceId }));

  const chooseRandomEmoji = (): void => chooseEmoji(pickRandomPageEmojiIcon().value);

  const chooseRandomSymbol = (color: PageIconColor): void => chooseSymbol(pickRandomPageIconSymbolName(), color);

  const uploadImage = (file: File): void =>
    runIconMutation(() => uploadPageIconImageAction({ file, pageId, previousAssetId, spaceId }));

  const removeIcon = (): void => runIconMutation(() => removePageIconAction({ pageId, previousAssetId, spaceId }));

  if (!canEdit) return <PagesIconDisplay icon={icon} label={accessibleLabel} />;

  return (
    <div>
      <Popover onOpenChange={setIsMenuOpen} open={isMenuOpen}>
        <PopoverTrigger asChild>
          <button
            aria-busy={isPending}
            aria-label={accessibleLabel}
            className={cn(
              'relative flex size-16 items-center justify-center text-4xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              icon === null && 'text-muted-foreground',
              isPending && 'opacity-50',
            )}
            disabled={isPending}
            type="button"
          >
            <PageIconGlyph icon={icon} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
          <PagesIconMenu
            hasIcon={icon !== null}
            isPending={isPending}
            onChooseEmoji={chooseEmoji}
            onChooseSymbol={chooseSymbol}
            onRandomEmoji={chooseRandomEmoji}
            onRandomSymbol={chooseRandomSymbol}
            onRemove={removeIcon}
            onUpload={uploadImage}
            symbolColor={symbolColor}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
