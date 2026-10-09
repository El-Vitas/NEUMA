import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/shared/utils/formatters';
import type { AccessToken } from '../types/access-tokens.types';

interface IProps {
  readonly token: Pick<AccessToken, 'createdAt' | 'expiresAt' | 'lastUsedAt'>;
}

/** Cuándo se creó un token, cuándo se usó por última vez y hasta cuándo sirve. */
export const AccessTokensDates = ({ token }: IProps) => {
  const t = useTranslations('accessTokens');
  const locale = useLocale();

  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
      <span>{t('created', { date: formatDate(token.createdAt, { includeTime: false, locale }) })}</span>
      <span>
        {token.lastUsedAt === null
          ? t('neverUsed')
          : t('lastUsed', { date: formatDate(token.lastUsedAt, { includeTime: false, locale }) })}
      </span>
      <span>
        {token.expiresAt === null
          ? t('noExpiry')
          : t('expires', { date: formatDate(token.expiresAt, { includeTime: false, locale }) })}
      </span>
    </p>
  );
};
