import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { config } from '@/shared/config';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { AccessTokensList } from '../components/access-tokens.list';
import { MCP_HTTP_PATH } from '../constants/access-tokens.constants';
import type { AccessToken } from '../types/access-tokens.types';

interface IProps {
  readonly tokens: readonly AccessToken[] | null;
}

/** Los tokens propios, dentro de la configuración. Crear y cambiar el acceso tienen su propia página. */
export const AccessTokensPersonalView = async ({ tokens }: IProps) => {
  const t = await getTranslations('accessTokens');

  return (
    <section aria-labelledby="access-tokens-heading" className="space-y-6">
      <SectionHeader
        action={
          tokens !== null && (
            <Button asChild className="min-h-11">
              <Link href={ROUTES.PORTAL_SETTINGS_TOKEN_NEW}>
                <Plus aria-hidden="true" className="size-4" />
                {t('create')}
              </Link>
            </Button>
          )
        }
        id="access-tokens-heading"
        subtitle={t('description')}
        title={t('title')}
      />
      <p className="text-muted-foreground text-sm">
        {t('connectAt')}{' '}
        <code className="break-all font-mono text-foreground">{`${config.backendApiUrl}${MCP_HTTP_PATH}`}</code>
      </p>
      <AccessTokensList tokens={tokens} />
    </section>
  );
};
