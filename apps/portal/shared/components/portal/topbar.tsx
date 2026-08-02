'use client';

import { LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { logout } from '@/modules/auth/server/lib/auth.logout.server';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useTheme } from '@/shared/components/ui/theme-provider';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { useRouter as useLocaleRouter } from '../../../i18n/navigation';

interface TopbarProps {
  onMenuClick?: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { isDark, toggleTheme, mounted } = useTheme();
  const localeRouter = useLocaleRouter();
  const t = useTranslations('common');
  const navigation = useTranslations('navigation');

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-4 border-sidebar-border border-b px-6 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <button
        aria-label={t('menu')}
        className={`flex size-11 items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden ${FOCUS_RING_CLASS}`}
        onClick={onMenuClick}
        type="button"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div suppressHydrationWarning>
          {mounted ? (
            <button
              aria-label={isDark ? t('lightMode') : t('darkMode')}
              className={`flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground hover:transition-colors hover:duration-200 ${FOCUS_RING_CLASS}`}
              onClick={toggleTheme}
              title={isDark ? t('lightMode') : t('darkMode')}
              type="button"
            >
              {isDark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
            </button>
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full" />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex min-h-11 items-center gap-2 rounded-none px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground ${FOCUS_RING_CLASS}`}
              type="button"
            >
              <div className="flex size-7 items-center justify-center rounded-none bg-primary font-semibold text-primary-foreground text-xs">
                A
              </div>
              <div className="hidden text-left sm:block">
                <p className="font-medium text-foreground text-sm leading-none">{navigation('administrator')}</p>
                <p className="mt-0.5 text-muted-foreground text-xs leading-none">{navigation('adminEmail')}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => localeRouter.push(ROUTES.PORTAL_ACCOUNT)}>
              <User aria-hidden="true" className="size-4" />
              {navigation('account')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild variant="destructive">
              <form action={logout} className="w-full">
                <button className="flex w-full items-center gap-2" type="submit">
                  <LogOut aria-hidden="true" className="size-4" />
                  {navigation('logout')}
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
