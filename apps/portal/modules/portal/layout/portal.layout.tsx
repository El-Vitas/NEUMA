'use client';

import type { UserRole } from '@neuma/shared';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PortalCommandBar } from '@/shared/components/portal/command-bar';
import { Sidebar } from '@/shared/components/portal/sidebar';
import { Topbar } from '@/shared/components/portal/topbar';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';
import { usePagesStart } from '@/shared/hooks/use.pages-start.hook';
import type { FavoritePage } from '@/shared/types/favorites.types';
import type { ThemeChoice } from '@/shared/types/theme.types';
import { isPortalCommandShortcut, isStartPageShortcut, resolveSpaceToStartPageIn } from '../lib/portal.keyboard.lib';
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
  const { startPage } = usePagesStart();
  // Refs let the keydown listener read the latest values without rebinding.
  const pathnameRef = useRef(pathname);
  const spacesRef = useRef(spaces);

  useEffect(() => {
    pathnameRef.current = pathname;
    spacesRef.current = spaces;
  }, [pathname, spaces]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPortalCommandShortcut(event)) {
        event.preventDefault();
        setCommandBarOpen(true);
        return;
      }
      if (!isStartPageShortcut(event)) return;
      const spaceId = resolveSpaceToStartPageIn(pathnameRef.current, spacesRef.current);
      if (spaceId === null) return;
      event.preventDefault();
      startPage(spaceId);
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [startPage]);

  // Moves focus to the content after each navigation.
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
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none"
          data-scroll-container="page"
          ref={mainRef}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <PortalCommandBar onOpenChange={setCommandBarOpen} open={commandBarOpen} />
    </div>
  );
};
