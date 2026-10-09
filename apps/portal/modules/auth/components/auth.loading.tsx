'use client';

import { useTranslations } from 'next-intl';

/**
 * What the login shows while it finds out who is there. It is drawn before the
 * page can wait for anything, so it reads its words from the provider the
 * layout already set up instead of asking the request for its language.
 */
export const AuthLoading = () => {
  const t = useTranslations('common');
  return (
    <section className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    </section>
  );
};
