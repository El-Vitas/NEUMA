'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { hasActionError, readActionFailureReason } from '@/shared/lib/action-result';

interface IProps {
  readonly revoke: (input: { readonly tokenId: string }) => Promise<unknown>;
  readonly tokenId: string;
  readonly tokenName: string;
}

/**
 * Revocar pide confirmación porque no tiene vuelta atrás: el agente queda
 * fuera en su siguiente llamada y el token no se puede reactivar. Quien llama
 * decide contra qué puerta se revoca, la propia o la de quien administra.
 */
export const AccessTokensRevokeDialog = ({ revoke, tokenId, tokenName }: IProps) => {
  const t = useTranslations('accessTokens');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmRevoke = (): void => {
    startTransition(async () => {
      const result = await revoke({ tokenId });
      if (hasActionError(result)) {
        toast.error(t(`errors.${readActionFailureReason(result)}`));
        return;
      }
      toast.success(t('revokeDialog.revoked', { name: tokenName }));
      setIsOpen(false);
    });
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label={t('revokeOf', { name: tokenName })}
          className="min-h-11 text-destructive hover:bg-destructive/10"
          type="button"
          variant="ghost"
        >
          {t('revoke')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('revokeDialog.title', { name: tokenName })}</DialogTitle>
          <DialogDescription>{t('revokeDialog.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
            type="button"
            variant="outline"
          >
            {t('revokeDialog.cancel')}
          </Button>
          <Button className="min-h-11" disabled={isPending} onClick={confirmRevoke} type="button" variant="destructive">
            {isPending ? t('revokeDialog.revoking') : t('revokeDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
