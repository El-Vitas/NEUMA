'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { copyTextToClipboard } from '@/shared/lib/clipboard.lib';
import { readRejectedText } from '../lib/local-cache.rejected.lib';
import type { RejectedTransaction } from '../types/local-cache.types';

interface IProps {
  readonly item: RejectedTransaction;
  readonly onDiscard: () => void;
}

/** One change the server refused: why, what the person wrote in it, and what they can do with it. */
export const LocalCacheRejectedChange = ({ item, onDiscard }: IProps) => {
  const t = useTranslations('pages.rejectedChanges');
  const [isCopied, setIsCopied] = useState(false);
  const text = readRejectedText(item);

  const copy = async (): Promise<void> => {
    setIsCopied(await copyTextToClipboard(text));
  };

  return (
    <li className="space-y-2 border-warning/30 border-t pt-2" data-testid="rejected-change">
      <p className="text-muted-foreground text-xs">{t(`causes.${item.cause}`)}</p>
      {text === '' ? (
        <p className="text-sm italic">{t('noText')}</p>
      ) : (
        <pre className="wrap-break-word whitespace-pre-wrap bg-surface p-2 text-sm" data-testid="rejected-change-text">
          {text}
        </pre>
      )}
      <div className="flex gap-2">
        {text !== '' && (
          <Button onClick={() => void copy()} size="sm" type="button" variant="outline">
            {isCopied ? t('copied') : t('copy')}
          </Button>
        )}
        <Button onClick={onDiscard} size="sm" type="button" variant="ghost">
          {t('discard')}
        </Button>
      </div>
    </li>
  );
};
