import { useLocale, useTranslations } from 'next-intl';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { formatDate } from '@/shared/utils/formatters';
import { ACCESS_TOKEN_PREFIX_ELLIPSIS } from '../constants/access-tokens.constants';
import { revokeWorkspaceAccessTokenAction } from '../server/actions/access-tokens.actions';
import type { WorkspaceAccessToken } from '../types/access-tokens.types';
import { AccessTokensRevokeDialog } from './access-tokens.revoke.dialog';
import { AccessTokensSummary } from './access-tokens.summary';

interface IProps {
  readonly token: WorkspaceAccessToken;
}

export const AccessTokensWorkspaceRow = ({ token }: IProps) => {
  const t = useTranslations('accessTokens');
  const locale = useLocale();

  return (
    <TableRow>
      <TableCell className="min-w-40 whitespace-normal px-4 py-3 align-top">
        <span className="block font-medium text-foreground">{token.name}</span>
        <span className="block font-mono text-muted-foreground text-xs">
          {token.displayPrefix}
          {ACCESS_TOKEN_PREFIX_ELLIPSIS}
        </span>
        <span className="mt-1 block text-muted-foreground text-sm">
          {t('workspace.ownedBy', { name: token.owner.name })}
        </span>
      </TableCell>
      <TableCell className="min-w-56 whitespace-normal px-4 py-3 align-top">
        <AccessTokensSummary token={token} />
      </TableCell>
      <TableCell className="min-w-24 whitespace-normal px-4 py-3 align-top">
        {token.lastUsedAt === null ? t('neverUsed') : formatDate(token.lastUsedAt, { includeTime: false, locale })}
      </TableCell>
      <TableCell className="min-w-24 whitespace-normal px-4 py-3 align-top">
        {token.expiresAt === null ? t('noExpiry') : formatDate(token.expiresAt, { includeTime: false, locale })}
      </TableCell>
      <TableCell className="px-4 py-3 align-top">
        <AccessTokensRevokeDialog revoke={revokeWorkspaceAccessTokenAction} tokenId={token.id} tokenName={token.name} />
      </TableCell>
    </TableRow>
  );
};
