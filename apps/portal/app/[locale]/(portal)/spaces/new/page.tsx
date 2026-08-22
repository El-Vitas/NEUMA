import { canEditContent, USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { SpacesCreateView } from '@/modules/spaces/views/spaces.create.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

const NewSpacePage = async () => {
  const user = await getCurrentUser();
  if (!canEditContent(user?.role ?? USER_ROLE.CLIENT)) notFound();
  return <SpacesCreateView />;
};

export default NewSpacePage;
