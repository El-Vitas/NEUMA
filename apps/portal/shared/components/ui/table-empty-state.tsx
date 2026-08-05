import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IProps {
  message?: string;
  action?: ReactNode;
  className?: string;
  colSpan: number;
}

const TableEmptyState = ({ message, action, className, colSpan }: IProps) => {
  return (
    <tr>
      <td className={cn('px-4 py-16 text-center text-muted-foreground text-sm', className)} colSpan={colSpan}>
        <p>{message}</p>
        {action && <div className="mt-3 flex justify-center">{action}</div>}
      </td>
    </tr>
  );
};

export { TableEmptyState };
