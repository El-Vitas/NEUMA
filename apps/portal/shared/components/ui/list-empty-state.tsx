import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/components/ui/empty-state';

interface IProps {
  readonly action?: ReactNode;
  readonly message?: string;
}

const ListEmptyState = ({ action, message }: IProps) => (
  <EmptyState action={action} className="border bg-surface py-12" message={message} />
);

export { ListEmptyState };
