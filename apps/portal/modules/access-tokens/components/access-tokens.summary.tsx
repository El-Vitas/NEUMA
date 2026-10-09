import { useTranslations } from 'next-intl';
import { summarizeAccessToken } from '../lib/access-tokens.lib';
import type { AccessToken } from '../types/access-tokens.types';
import { AccessTokensSummaryPlace } from './access-tokens.summary.place';

interface IProps {
  readonly token: Pick<AccessToken, 'allSpaces' | 'hiddenPlaceCount' | 'pages' | 'spaces'>;
}

/** Places the viewer cannot see are only counted, never named. */
export const AccessTokensSummary = ({ token }: IProps) => {
  const t = useTranslations('accessTokens');

  return (
    <ul className="space-y-1 text-sm">
      {summarizeAccessToken(token).map((line) => (
        <li className="text-foreground" key={line.key}>
          <AccessTokensSummaryPlace target={line.target} />
          <span className="text-muted-foreground"> · {t(`levels.${line.level}`)}</span>
        </li>
      ))}
      {token.hiddenPlaceCount > 0 && (
        <li className="text-muted-foreground">{t('hiddenPlaces', { count: token.hiddenPlaceCount })}</li>
      )}
    </ul>
  );
};
