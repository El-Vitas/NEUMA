'use client';

import { useTranslations } from 'next-intl';
import { PagesIconMenu } from '@/modules/pages/appearance/components/pages.icon.menu';
import {
  isPageImageIcon,
  isPageSymbolIcon,
  pickRandomPageEmojiIcon,
  pickRandomPageIconSymbolName,
} from '@/modules/pages/appearance/lib/pages.icon.lib';
import {
  removePageIconAction,
  setPageIconEmojiAction,
  setPageIconSymbolAction,
  uploadPageIconImageAction,
} from '@/modules/pages/appearance/server/actions/pages.icon.actions';
import type { PageIcon, PageIconColor } from '@/modules/pages/appearance/types/pages.icon.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useIconMutation } from '@/shared/hooks/use.icon-mutation.hook';

interface IProps {
  readonly onChanged: () => void;
  readonly onClose: () => void;
  readonly page: { readonly icon: null | PageIcon; readonly id: string; readonly title: string } | null;
  readonly spaceId: string;
}

/**
 * A page's mark changed from the tree, without opening it.
 *
 * It offers exactly what the page's own header offers, because two ways of
 * choosing an icon that disagree about what is on offer would be worse than
 * having only one.
 */
export const SidebarPageIconDialog = ({ onChanged, onClose, page, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const { isPending, runIconMutation } = useIconMutation(onChanged, onClose);

  if (page === null) return null;

  const previousAssetId = page.icon !== null && isPageImageIcon(page.icon) ? page.icon.assetId : undefined;
  const symbolColor: PageIconColor = page.icon !== null && isPageSymbolIcon(page.icon) ? page.icon.color : 'default';

  const chooseEmoji = (value: string): void =>
    runIconMutation(() => setPageIconEmojiAction({ pageId: page.id, spaceId, value }));

  const chooseSymbol = (name: string, color: PageIconColor): void =>
    runIconMutation(() => setPageIconSymbolAction({ color, name, pageId: page.id, spaceId }));

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="w-[min(22rem,calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t('changeIcon')}</DialogTitle>
        </DialogHeader>
        <PagesIconMenu
          hasIcon={page.icon !== null}
          isPending={isPending}
          onChooseEmoji={chooseEmoji}
          onChooseSymbol={chooseSymbol}
          onRandomEmoji={() => chooseEmoji(pickRandomPageEmojiIcon().value)}
          onRandomSymbol={(color) => chooseSymbol(pickRandomPageIconSymbolName(), color)}
          onRemove={() => runIconMutation(() => removePageIconAction({ pageId: page.id, previousAssetId, spaceId }))}
          onUpload={(file) =>
            runIconMutation(() => uploadPageIconImageAction({ file, pageId: page.id, previousAssetId, spaceId }))
          }
          symbolColor={symbolColor}
        />
      </DialogContent>
    </Dialog>
  );
};
