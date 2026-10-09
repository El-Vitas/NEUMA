'use client';

import type { PageIcon, PageIconColor } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { PagesIconMenu } from '@/modules/pages/appearance/components/pages.icon.menu';
import { pickRandomPageEmojiIcon, pickRandomPageIconSymbolName } from '@/modules/pages/appearance/lib/pages.icon.lib';
import {
  removeSpaceIconAction,
  setSpaceIconEmojiAction,
  setSpaceIconSymbolAction,
} from '@/modules/spaces/server/actions/spaces.icon.actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useIconMutation } from '@/shared/hooks/use.icon-mutation.hook';

interface IProps {
  readonly onChanged: () => void;
  readonly onClose: () => void;
  readonly space: { readonly icon: null | PageIcon; readonly id: string; readonly name: string } | null;
}

/** Offers the page icons minus uploaded images, which are unreadable at text size. */
export const SidebarSpaceIconDialog = ({ onChanged, onClose, space }: IProps) => {
  const t = useTranslations('navigation');
  const { isPending, runIconMutation } = useIconMutation(onChanged, onClose);

  if (space === null) return null;

  const symbolColor: PageIconColor = space.icon !== null && space.icon.kind === 'symbol' ? space.icon.color : 'default';

  const chooseEmoji = (value: string): void =>
    runIconMutation(() => setSpaceIconEmojiAction({ spaceId: space.id, value }));

  const chooseSymbol = (name: string, color: PageIconColor): void =>
    runIconMutation(() => setSpaceIconSymbolAction({ color, name, spaceId: space.id }));

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="w-[min(22rem,calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t('changeSpaceIcon')}</DialogTitle>
        </DialogHeader>
        <PagesIconMenu
          hasIcon={space.icon !== null}
          isPending={isPending}
          onChooseEmoji={chooseEmoji}
          onChooseSymbol={chooseSymbol}
          onRandomEmoji={() => chooseEmoji(pickRandomPageEmojiIcon().value)}
          onRandomSymbol={(color) => chooseSymbol(pickRandomPageIconSymbolName(), color)}
          onRemove={() => runIconMutation(() => removeSpaceIconAction({ spaceId: space.id }))}
          symbolColor={symbolColor}
        />
      </DialogContent>
    </Dialog>
  );
};
