import { getTranslations } from 'next-intl/server';
import { ProfileForm } from '@/shared/components/profile/profile.form';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly user: { id: string; name: string; email: string; role: string } | null;
}

export const AccountView = async ({ user }: IProps) => {
  const t = await getTranslations('account');
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      {user && <ProfileForm user={user} />}
    </div>
  );
};
