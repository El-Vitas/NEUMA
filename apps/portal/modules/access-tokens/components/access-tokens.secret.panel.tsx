'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { FormActions } from '@/shared/components/forms/form-actions';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { buildAccessTokenMcpConfig } from '../lib/access-tokens.lib';
import { AccessTokensCopyButton } from './access-tokens.copy.button';

interface IProps {
  readonly mcpUrl: string;
  readonly secret: string;
}

/**
 * El token recién creado, la única vez que se ve entero.
 *
 * Al aparecer, el foco va al token: el botón que lo pidió ya no existe, y lo
 * siguiente que hay que hacer es copiarlo. El secreto vive solo mientras esta
 * página está abierta; no pasa por la dirección ni por ninguna caché.
 */
export const AccessTokensSecretPanel = ({ mcpUrl, secret }: IProps) => {
  const t = useTranslations('accessTokens');
  const headingId = useId();
  const tokenId = useId();
  const configId = useId();
  const configHintId = useId();
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const config = buildAccessTokenMcpConfig(mcpUrl, secret);

  useEffect(() => {
    tokenInputRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={headingId} className="space-y-8">
      <div className="flex gap-3 border border-border bg-surface-container-low p-4" role="note">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <h2 className="font-semibold text-foreground" id={headingId}>
            {t('secret.title')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('secret.description')}</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={tokenId}>{t('secret.token')}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="min-h-11 font-mono"
            id={tokenId}
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            ref={tokenInputRef}
            value={secret}
          />
          <AccessTokensCopyButton label={t('secret.copyToken')} text={secret} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={configId}>{t('secret.config')}</Label>
        <p className="text-muted-foreground text-sm" id={configHintId}>
          {t('secret.configHint')}
        </p>
        <textarea
          aria-describedby={configHintId}
          className="h-48 w-full resize-none border border-border bg-surface-container-low p-3 font-mono text-xs"
          id={configId}
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          spellCheck={false}
          value={config}
          wrap="off"
        />
        <AccessTokensCopyButton label={t('secret.copyConfig')} text={config} />
      </div>
      <div className="border-border border-t pt-6">
        <FormActions>
          <Button asChild className="min-h-11">
            <Link href={ROUTES.PORTAL_SETTINGS_TOKENS}>{t('secret.done')}</Link>
          </Button>
        </FormActions>
      </div>
    </section>
  );
};
