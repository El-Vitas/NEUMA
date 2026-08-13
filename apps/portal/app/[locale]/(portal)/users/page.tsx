import { USER_ROLE } from '@company-brain/shared';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { usersListParamsSchema } from '@/modules/users/schemas/users.schemas';
import { getUsers } from '@/modules/users/server/queries/users.queries';
import { UsersView } from '@/modules/users/views/users.view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { redirect } from '../../../../i18n/navigation';

interface IProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: IProps) {
  const user = await getCurrentUser();
  if (user?.role !== USER_ROLE.ADMIN) {
    redirect({ href: ROUTES.PORTAL, locale: await getLocale() });
  }

  const params = usersListParamsSchema.parse(await searchParams);
  const result = await getUsers(params);

  return <UsersView params={params} users={result.isOk() ? result.getValue() : null} />;
}
