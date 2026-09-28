import { useTranslations } from 'next-intl';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { ListEmptyState } from '@/shared/components/ui/list-empty-state';
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import type { WorkspaceAccessToken } from '../types/access-tokens.types';
import { AccessTokensWorkspaceRow } from './access-tokens.workspace.row';

interface IProps {
  readonly tokens: readonly WorkspaceAccessToken[] | null;
}

/**
 * Los tokens vivos de todo el espacio de trabajo, en una tabla. Son pocos por
 * construcción (un tope por persona), así que se muestran todos sin paginar.
 */
export const AccessTokensWorkspaceTable = ({ tokens }: IProps) => {
  const t = useTranslations('accessTokens.workspace');

  if (tokens === null) return <FormErrorBanner message={t('loadError')} />;
  if (tokens.length === 0) return <ListEmptyState message={t('empty')} />;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{t('count', { count: tokens.length })}</p>
      <div className="border border-border bg-card">
        <Table>
          <TableCaption className="sr-only">{t('caption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4" scope="col">
                {t('token')}
              </TableHead>
              <TableHead className="px-4" scope="col">
                {t('access')}
              </TableHead>
              <TableHead className="px-4" scope="col">
                {t('lastUse')}
              </TableHead>
              <TableHead className="px-4" scope="col">
                {t('expiry')}
              </TableHead>
              <TableHead className="px-4" scope="col">
                <span className="sr-only">{t('actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <AccessTokensWorkspaceRow key={token.id} token={token} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
