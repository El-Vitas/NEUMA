'use client';

import Link from 'next/link';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** Sits outside the locale segment, so the copy is fixed English. Never shows the exception message. */
const ErrorPage = ({ error, reset }: IProps) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
    <h1 className="text-center font-semibold text-2xl">This page could not be opened</h1>
    <p className="max-w-prose text-center text-muted-foreground text-sm">
      Something on our side stopped working. Your writing is safe. Try again, and if it keeps happening, tell us the
      reference below.
    </p>
    <div className="flex items-center gap-2">
      <button
        className="min-h-11 bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
      <Link
        className="min-h-11 border border-border px-4 py-2 text-foreground text-sm hover:bg-muted"
        href={ROUTES.PORTAL}
      >
        Go to the start
      </Link>
    </div>
    {error.digest === undefined ? null : (
      <p className="text-muted-foreground/70 text-xs">{`Reference: ${error.digest}`}</p>
    )}
  </div>
);

export default ErrorPage;
