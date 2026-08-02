export const SIDEBAR_STORAGE_KEY = 'company-brain-sidebar-collapsed';
export const SIDEBAR_COLLAPSED_WIDTH = 'w-14';
export const SIDEBAR_EXPANDED_WIDTH = 'w-60';
export const SIDEBAR_TRANSITION_DURATION_MS = 300;

export const SIDEBAR_STRIPE_COLORS = {
  dark: { stripe: 'rgba(255,255,255,0.015)' },
  light: { stripe: 'rgba(0,0,0,0.04)' },
} as const;

export const SIDEBAR_HOVER_CLASS =
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:transition-colors hover:duration-200';
