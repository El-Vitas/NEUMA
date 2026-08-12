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

/**
 * The row where a screen's actions live: what moves forward on the right, what
 * goes back on the left.
 *
 * Reading ends where the action is expected, so the button that advances sits
 * at the end of the line and the one that returns at its start. Declaring it
 * here once keeps every screen answering the same way instead of each deciding
 * on its own; stacked on a narrow screen the forward action comes first, within
 * reach of the thumb.
 */
export const FormActions = ({ back, children, className }: IProps) => (
  <div className={cn(FORM_ACTIONS_ROW_CLASS, className)}>
    <div className={FORM_ACTIONS_BACK_CLASS}>{back}</div>
    <div className={FORM_ACTIONS_FORWARD_CLASS}>{children}</div>
  </div>
);
