import { getTranslations } from 'next-intl/server';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { AccessTokensWorkspaceTable } from '../components/access-tokens.workspace.table';
import type { WorkspaceAccessToken } from '../types/access-tokens.types';

interface IProps {
  readonly tokens: readonly WorkspaceAccessToken[] | null;
}

/** La sección de quien administra: quién tiene tokens, qué pueden hacer, y revocarlos. */
export const AccessTokensWorkspaceView = async ({ tokens }: IProps) => {
  const t = await getTranslations('accessTokens.workspace');

  return (
    <section aria-labelledby="workspace-tokens-heading" className="space-y-6">
      <SectionHeader id="workspace-tokens-heading" subtitle={t('subtitle')} title={t('title')} />
      <AccessTokensWorkspaceTable tokens={tokens} />
    </section>
  );
};
