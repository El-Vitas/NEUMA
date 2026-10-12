import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SettingsLayoutView } from '@/modules/settings/views/settings.layout.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

interface IProps {
  readonly children: ReactNode;
}

/** The sections offered depend on the viewer's role. */
export default async function Layout({ children }: IProps) {
  const user = await getCurrentUser();
  if (user === null) notFound();

  return <SettingsLayoutView role={user.role}>{children}</SettingsLayoutView>;
}
