'use client';

import type { UserRole } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MobileNav } from '@/shared/components/portal/mobile-nav';
import { Sidebar } from '@/shared/components/portal/sidebar';
import { Topbar } from '@/shared/components/portal/topbar';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';

interface PortalLayoutProps {
  children: React.ReactNode;
  readonly role: UserRole;
}

export const PortalLayout = ({ children, role }: PortalLayoutProps) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = useTranslations('navigation');

  return (
    <div className="fixed inset-0 flex bg-background">
      <div className="hidden shrink-0 lg:block">
        <Sidebar role={role} />
      </div>

      <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
        <SheetContent className="w-72 p-0" side="left">
          <SheetTitle className="sr-only">{t('mobileMenu')}</SheetTitle>
          <MobileNav onNavigate={() => setMobileNavOpen(false)} role={role} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
