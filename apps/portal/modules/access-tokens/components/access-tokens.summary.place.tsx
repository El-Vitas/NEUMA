import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccessTokenSummaryTarget } from '../types/access-tokens.types';

interface IProps {
  readonly target: AccessTokenSummaryTarget;
}

/** Dónde vale una línea del resumen: en todos los espacios, en un espacio, o en una página con lo que cuelga de ella. */
export const AccessTokensSummaryPlace = ({ target }: IProps) => {
  const t = useTranslations('accessTokens');

  switch (target.kind) {
    case 'ALL':
      return <span className="font-medium">{t('allSpaces')}</span>;
    case 'SPACE':
      return <span className="font-medium">{target.spaceName}</span>;
    default:
      return (
        <span>
          <FileText aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px] text-muted-foreground" />
          <span className="font-medium">{target.pageTitle}</span>
          <span className="text-muted-foreground"> {t('inSpace', { space: target.spaceName })}</span>
        </span>
      );
  }
};
