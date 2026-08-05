import { USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { SpacesCreateView } from '@/modules/spaces/views/spaces.create.view';

const NewSpacePage = async () => {
  const user = await getCurrentUser();
  if (!canEditContent(user?.role ?? USER_ROLE.CLIENT)) notFound();
  return <SpacesCreateView />;
};

export default NewSpacePage;
