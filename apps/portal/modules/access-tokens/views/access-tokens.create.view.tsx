import type { UserRole } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { config } from '@/shared/config';
import { AccessTokensCreatePanel } from '../components/access-tokens.create.panel';
import { MCP_HTTP_PATH } from '../constants/access-tokens.constants';
import type { AccessTokenSpaceOption } from '../types/access-tokens.types';

interface IProps {
  readonly role: UserRole;
  /** Los espacios que la persona ve, o nada si no cargaron: sin ellos no se ofrece crear. */
  readonly spaces: readonly AccessTokenSpaceOption[] | null;
  readonly takenNames: readonly string[] | null;
}

/** La sección para crear un token, con espacio para armar su acceso. */
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
        <AccessTokensCreatePanel
          mcpUrl={`${config.backendApiUrl}${MCP_HTTP_PATH}`}
          role={role}
          spaces={spaces}
          takenNames={takenNames}
        />
      )}
    </section>
  );
};
