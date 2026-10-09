'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { copyTextToClipboard } from '@/shared/lib/clipboard.lib';

interface IProps {
  readonly label: string;
  readonly text: string;
}

export const AccessTokensCopyButton = ({ label, text }: IProps) => {
  const t = useTranslations('accessTokens');

  const copy = async (): Promise<void> => {
    if (await copyTextToClipboard(text)) toast.success(t('secret.copied'));
    else toast.error(t('secret.copyError'));
  };

  return (
    <Button className="min-h-11" onClick={copy} type="button" variant="outline">
      <Copy aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
};
