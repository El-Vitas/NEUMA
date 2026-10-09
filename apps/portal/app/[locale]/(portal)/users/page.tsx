import { USER_ROLE } from '@neuma/shared';
import { getLocale } from 'next-intl/server';
import { usersListParamsSchema } from '@/modules/users/schemas/users.schemas';
import { getUsers } from '@/modules/users/server/queries/users.queries';
import { UsersView } from '@/modules/users/views/users.view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';
import type { RouteSearchParams } from '@/shared/types/route-search-params.types';
import { redirect } from '../../../../i18n/navigation';

interface IProps {
  readonly searchParams: Promise<RouteSearchParams>;
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
