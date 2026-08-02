import type { StatCardTone } from '../types/stat-card.types';

export const STAT_CARD_TONE_CLASS: Record<StatCardTone, string> = {
  neutral: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};
