import type { ReactNode } from 'react';

interface AuthViewLayoutProps {
  children: ReactNode;
  description: string;
  title: string;
}

export const AuthViewLayout = ({ children, description, title }: AuthViewLayoutProps) => {
  return (
    <section className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-xl border border-border bg-surface-container p-8 md:p-10">
        <h1 className="font-semibold text-4xl tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-3 text-base text-status-muted">{description}</p>

        {children}
      </div>
    </section>
  );
};
