import { canEditContent, USER_ROLE } from '@company-brain/shared';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { SpacesView } from '@/modules/spaces/views/spaces.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

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
