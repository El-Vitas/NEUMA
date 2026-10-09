import type { UserRole } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { config } from '@/shared/config';
import { AccessTokensCreatePanel } from '../components/access-tokens.create.panel';
import type { AccessTokenSpaceOption } from '../types/access-tokens.types';

interface IProps {
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[] | null;
  readonly takenNames: readonly string[] | null;
}

export const AccessTokensCreateView = async ({ role, spaces, takenNames }: IProps) => {
  const t = await getTranslations('accessTokens');

  return (
    <section aria-labelledby="access-token-create-heading" className="space-y-8">
      <SectionHeader
        id="access-token-create-heading"
        subtitle={t('form.createDescription')}
        title={t('form.createTitle')}
      />
      {spaces === null || takenNames === null ? (
        <FormErrorBanner message={t('loadError')} />
      ) : (
        <AccessTokensCreatePanel mcpUrl={config.mcpPublicUrl} role={role} spaces={spaces} takenNames={takenNames} />
      )}
    </section>
  );
};
