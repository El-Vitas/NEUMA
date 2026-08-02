import { DASHBOARD_SKELETON_QUICK_ACTION_COUNT, DASHBOARD_STAT_WIDGET_COUNT } from '../constants/portal.constants';

export const PortalContentSkeleton = () => {
  const quickActions = Array.from({ length: DASHBOARD_SKELETON_QUICK_ACTION_COUNT }, (_, index) => ({
    id: `quick-action-${index}`,
  }));
  const statCards = Array.from({ length: DASHBOARD_STAT_WIDGET_COUNT }, (_, index) => ({ id: `stat-${index}` }));

  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 animate-pulse bg-muted" />
      <div className="flex flex-wrap items-center gap-2">
        {quickActions.map((item) => (
          <div className="h-10 w-36 animate-pulse bg-muted" key={item.id} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((item) => (
          <div className="h-24 animate-pulse border border-border bg-card p-6" key={item.id} />
        ))}
      </div>
      <div className="h-64 animate-pulse border border-border bg-card" />
    </div>
  );
};
