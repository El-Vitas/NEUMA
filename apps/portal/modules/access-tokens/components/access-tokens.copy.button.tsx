'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';

interface IProps {
  readonly label: string;
  readonly text: string;
}

/** Copia al portapapeles y lo dice. Si el navegador no deja, lo dice también, para copiarlo a mano. */
export const AccessTokensCopyButton = ({ label, text }: IProps) => {
  const t = useTranslations('accessTokens');

  const copy = (): void => {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t('secret.copied')))
      .catch(() => toast.error(t('secret.copyError')));
  };

  return (
    <Button className="min-h-11" onClick={copy} type="button" variant="outline">
      <Copy aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
};
