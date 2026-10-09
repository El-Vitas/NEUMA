import type { UserRole } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { AccessTokensEditForm } from '../components/access-tokens.edit.form';
import type { AccessToken, AccessTokenSpaceOption } from '../types/access-tokens.types';

interface IProps {
  readonly role: UserRole;
  /** Los espacios que la persona ve, o nada si no cargaron: sin ellos no se ofrece cambiar el acceso. */
  readonly spaces: readonly AccessTokenSpaceOption[] | null;
  readonly token: AccessToken;
}

/** La sección para cambiar lo que puede un token, con espacio para sus reglas. */
export const AccessTokensEditView = async ({ role, spaces, token }: IProps) => {
  const t = await getTranslations('accessTokens');

  return (
    <section aria-labelledby="access-token-edit-heading" className="space-y-8">
      <SectionHeader
        id="access-token-edit-heading"
        subtitle={t('form.editDescription')}
        title={t('editAccessOf', { name: token.name })}
      />
      {spaces === null ? (
        <FormErrorBanner message={t('loadError')} />
      ) : (
        <AccessTokensEditForm role={role} spaces={spaces} token={token} />
      )}
    </section>
  );
};
