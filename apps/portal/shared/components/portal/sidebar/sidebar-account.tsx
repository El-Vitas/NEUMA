'use client';

import { LogOut, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { logout } from '@/modules/auth/server/lib/auth.logout.server';
import type { PortalLayoutUser } from '@/modules/portal/types/portal.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly collapsed: boolean;
  readonly user: PortalLayoutUser;
}

export const SidebarAccount = ({ collapsed, user }: IProps) => {
  const router = useRouter();
  const t = useTranslations('navigation');

  return (
    <div className="border-sidebar-border border-t p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={user.name}
            className={`flex min-h-11 w-full items-center gap-3 px-2 text-left text-sidebar-foreground ${FOCUS_RING_CLASS}`}
            type="button"
          >
            <span className="flex size-7 shrink-0 items-center justify-center bg-primary font-semibold text-primary-foreground text-xs">
              {user.name.charAt(0)}
            </span>
            {!collapsed && <span className="min-w-0 truncate text-sm">{user.name}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => router.push(ROUTES.PORTAL_ACCOUNT)}>
            <UserIcon aria-hidden="true" className="size-4" />
            {t('account')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive">
            <form action={logout} className="w-full">
              <button className="flex w-full items-center gap-2" type="submit">
                <LogOut aria-hidden="true" className="size-4" />
                {t('logout')}
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
