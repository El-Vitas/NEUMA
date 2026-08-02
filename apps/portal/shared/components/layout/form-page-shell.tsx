import type { ReactNode } from 'react';
import { BackButton } from '@/shared/components/ui/back-button';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly backHref: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
}

export const FormPageShell = ({ backHref, title, subtitle, children }: IProps) => (
  <div className="p-6">
    <BackButton href={backHref} />
    <div className="mx-auto mt-4 max-w-2xl space-y-6">
      <PageHeader subtitle={subtitle} title={title} />
      <div className="border border-border bg-card p-6">{children}</div>
    </div>
  </div>
);
