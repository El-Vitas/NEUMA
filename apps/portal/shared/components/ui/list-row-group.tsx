import type { ReactNode } from 'react';

interface IProps {
  readonly ariaLabel: string;
  readonly children: ReactNode;
}

const ListRowGroup = ({ ariaLabel, children }: IProps) => (
  <ul aria-label={ariaLabel} className="divide-y divide-border border-border border-y">
    {children}
  </ul>
);

export { ListRowGroup };
