import { USER_ROLE } from '@company-brain/shared';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { SpacesView } from '@/modules/spaces/views/spaces.view';

const SpacesPage = async () => {
  const [spacesResult, user] = await Promise.all([getSpaces(), getCurrentUser()]);
  return (
    <SpacesView
      canCreate={canEditContent(user?.role ?? USER_ROLE.CLIENT)}
      spaces={spacesResult.isOk() ? spacesResult.getValue() : null}
    />
  );
};

export default SpacesPage;
