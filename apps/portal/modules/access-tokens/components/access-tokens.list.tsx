import { useTranslations } from 'next-intl';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { ListEmptyState } from '@/shared/components/ui/list-empty-state';
import type { AccessToken } from '../types/access-tokens.types';
import { AccessTokensItem } from './access-tokens.item';

interface IProps {
  readonly tokens: readonly AccessToken[] | null;
}

/** Los tokens de quien mira, o por qué no se ven: no cargaron, o todavía no hay ninguno. */
export const AccessTokensList = ({ tokens }: IProps) => {
  const t = useTranslations('accessTokens');

  if (tokens === null) return <FormErrorBanner message={t('loadError')} />;
  if (tokens.length === 0) return <ListEmptyState message={t('empty')} />;

  return (
    <ul className="space-y-3">
      {tokens.map((token) => (
        <AccessTokensItem key={token.id} token={token} />
      ))}
    </ul>
  );
};
