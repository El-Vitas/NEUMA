import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { STAT_CARD_TONE_CLASS } from './constants/stat-card.constants';
import type { StatCardDelta, StatCardTone } from './types/stat-card.types';

interface IProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly icon?: ReactNode;
  readonly tone?: StatCardTone;
  readonly delta?: StatCardDelta;
  readonly className?: string;
}

export const StatCard = ({ label, value, icon, tone = 'neutral', delta, className }: IProps) => (
  <div className={cn('flex flex-col gap-3 border border-border bg-card p-6 hover:border-primary/40', className)}>
    <div className="flex items-center justify-between">
      <p className="font-medium text-muted-foreground text-sm">{label}</p>
      {icon}
    </div>
    <p className={cn('font-bold text-2xl tabular-nums tracking-tight', STAT_CARD_TONE_CLASS[tone])}>{value}</p>
    {delta && (
      <p className={cn('flex items-center gap-1 text-xs', delta.value >= 0 ? 'text-success' : 'text-danger')}>
        {delta.value >= 0 ? (
          <TrendingUp aria-hidden="true" className="size-3.5" />
        ) : (
          <TrendingDown aria-hidden="true" className="size-3.5" />
        )}
        <span>
          {delta.value >= 0 ? '+' : ''}
          {delta.value}%
        </span>
        {delta.label && <span className="text-muted-foreground">{delta.label}</span>}
      </p>
    )}
  </div>
);
