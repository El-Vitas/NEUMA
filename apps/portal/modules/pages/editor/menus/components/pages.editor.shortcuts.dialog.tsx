'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  PAGE_EDITOR_SHORTCUT_KEY_STYLE_CLASS,
  PAGE_EDITOR_SHORTCUTS,
} from '../constants/pages.editor.shortcuts.constants';
import { readPageEditorShortcutKeys } from '../lib/pages.editor.shortcuts.lib';

interface IProps {
  readonly usesCommandKey: boolean;
}

export const PagesEditorShortcutsDialog = ({ usesCommandKey }: IProps) => {
  const t = useTranslations('pages');
  const shortcuts = useMemo(
    () => PAGE_EDITOR_SHORTCUTS.map((shortcut) => readPageEditorShortcutKeys(shortcut, usesCommandKey)),
    [usesCommandKey],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex min-h-11 items-center text-left text-muted-foreground text-sm hover:text-foreground"
          type="button"
        >
          {t('openShortcuts')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('shortcutsTitle')}</DialogTitle>
          <DialogDescription>{t('shortcutsDescription')}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {shortcuts.map((shortcut) => (
            <li className="flex items-center justify-between gap-4 text-sm" key={shortcut.binding}>
              <span>{t(`shortcuts.${shortcut.labelKey}`)}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd className={PAGE_EDITOR_SHORTCUT_KEY_STYLE_CLASS} key={key}>
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
