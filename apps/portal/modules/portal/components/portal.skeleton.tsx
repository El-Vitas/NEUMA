import { DASHBOARD_SKELETON_SIDEBAR_ITEM_COUNT } from '../constants/portal.constants';
import { SIDEBAR_EXPANDED_WIDTH } from '../constants/sidebar.constants';
import { PortalContentSkeleton } from './portal.content.skeleton';

export const PortalSkeleton = () => {
  const sidebarItems = Array.from({ length: DASHBOARD_SKELETON_SIDEBAR_ITEM_COUNT }, (_, index) => ({
    id: `sidebar-${index}`,
  }));

  return (
    <div className="flex h-screen bg-background">
      <div
        className={`${SIDEBAR_EXPANDED_WIDTH} hidden border-sidebar-border border-r bg-sidebar lg:block`}
        style={{ width: 'var(--sidebar-width, 15rem)' }}
      >
        <div className="border-sidebar-border border-b p-4">
          <div className="h-16 w-full animate-pulse bg-muted" />
        </div>
        <div className="space-y-2 p-2">
          {sidebarItems.map((item) => (
            <div className="h-10 w-full animate-pulse rounded-none bg-muted" key={item.id} />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="h-14 border-sidebar-border border-b bg-background" />
        <div className="flex-1 overflow-y-auto">
          <PortalContentSkeleton />
        </div>
      </div>
    </div>
  );
};
