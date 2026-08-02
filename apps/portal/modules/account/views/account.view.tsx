import { ProfileForm } from '@/shared/components/profile/profile.form';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly user: { id: string; name: string; email: string; role: string } | null;
}

export const AccountView = ({ user }: IProps) => {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader subtitle="Administra tu información personal" title="Mi cuenta" />
      {user && <ProfileForm user={user} />}
    </div>
  );
};
