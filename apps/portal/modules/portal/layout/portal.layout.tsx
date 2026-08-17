'use client';

import type { UserRole } from '@company-brain/shared';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PortalCommandBar } from '@/shared/components/portal/command-bar';
import { Sidebar } from '@/shared/components/portal/sidebar';
import { Topbar } from '@/shared/components/portal/topbar';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';
import type { FavoritePage } from '@/shared/types/favorites.types';
import type { ThemeChoice } from '@/shared/types/theme.types';
import { isPortalCommandShortcut } from '../lib/portal.keyboard.lib';
import type { PortalLayoutSpace, PortalLayoutUser } from '../types/portal.types';

interface PortalLayoutProps {
  readonly favorites: readonly FavoritePage[];
  readonly themeChoice: ThemeChoice;
  children: React.ReactNode;
  readonly role: UserRole;
  readonly spaces: readonly PortalLayoutSpace[];
  readonly user: PortalLayoutUser;
}

export const PortalLayout = ({ children, favorites, role, spaces, themeChoice, user }: PortalLayoutProps) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const lastPathnameRef = useRef<string | null>(null);
  const t = useTranslations('navigation');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPortalCommandShortcut(event)) {
        event.preventDefault();
        setCommandBarOpen(true);
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Every arrival puts the reader back at the content, which is what changed
   * under them. The address is read rather than merely awaited, so what the
   * effect answers to is plain to see.
   */
  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="fixed inset-0 flex bg-background">
      <div className="hidden shrink-0 lg:block">
        <Sidebar favorites={favorites} role={role} spaces={spaces} themeChoice={themeChoice} user={user} />
      </div>

      <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
        <SheetContent className="w-72 p-0" side="left">
          <SheetTitle className="sr-only">{t('mobileMenu')}</SheetTitle>
          <Sidebar
            enableCollapsing={false}
            enableKeyboardShortcut={false}
            favorites={favorites}
            onNavigate={() => setMobileNavOpen(false)}
            role={role}
            spaces={spaces}
            themeChoice={themeChoice}
            user={user}
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} onSearchClick={() => setCommandBarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none" ref={mainRef} tabIndex={-1}>
          {children}
        </main>
      </div>
      <PortalCommandBar onOpenChange={setCommandBarOpen} open={commandBarOpen} />
    </div>
  );
};
