import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { ACCESS_TOKEN_PREFIX_ELLIPSIS } from '../constants/access-tokens.constants';
import { revokeAccessTokenAction } from '../server/actions/access-tokens.actions';
import type { AccessToken } from '../types/access-tokens.types';
import { AccessTokensDates } from './access-tokens.dates';
import { AccessTokensRevokeDialog } from './access-tokens.revoke.dialog';
import { AccessTokensSummary } from './access-tokens.summary';

interface IProps {
  readonly token: AccessToken;
}

/**
 * Un token de quien mira: cómo se llama, cómo empieza, qué puede hacer y
 * cuándo se usó. Cambiar el acceso lleva a su propia página; revocar queda
 * separado, para que no se toque uno buscando el otro.
 */
export const AccessTokensItem = ({ token }: IProps) => {
  const t = useTranslations('accessTokens');

  return (
    <li className="space-y-3 border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-foreground">{token.name}</h4>
          <p className="font-mono text-muted-foreground text-xs">
            {token.displayPrefix}
            {ACCESS_TOKEN_PREFIX_ELLIPSIS}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button asChild className="min-h-11" variant="outline">
            <Link aria-label={t('editAccessOf', { name: token.name })} href={ROUTES.PORTAL_SETTINGS_TOKEN(token.id)}>
              {t('editAccess')}
            </Link>
          </Button>
          <AccessTokensRevokeDialog revoke={revokeAccessTokenAction} tokenId={token.id} tokenName={token.name} />
        </div>
      </div>
      <AccessTokensSummary token={token} />
      <AccessTokensDates token={token} />
    </li>
  );
};
