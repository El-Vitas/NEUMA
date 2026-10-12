import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  FORM_ACTIONS_BACK_CLASS,
  FORM_ACTIONS_FORWARD_CLASS,
  FORM_ACTIONS_ROW_CLASS,
} from '@/shared/constants/forms.constants';

interface IProps {
  readonly back?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export const FormActions = ({ back, children, className }: IProps) => (
  <div className={cn(FORM_ACTIONS_ROW_CLASS, className)}>
    <div className={FORM_ACTIONS_BACK_CLASS}>{back}</div>
    <div className={FORM_ACTIONS_FORWARD_CLASS}>{children}</div>
  </div>
);
