'use client';

import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GlobalErrorPage = ({ error, reset }: IProps) => (
  <html lang="en">
    <body className="bg-white text-neutral-900">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="font-semibold text-2xl">Something went wrong</h1>
        <p className="max-w-md text-center text-neutral-500 text-sm">
          {error.message || 'We could not load this page. Try again or return home.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="rounded-none bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <a
            className="rounded-none border border-neutral-300 px-4 py-2 text-neutral-700 text-sm hover:bg-neutral-100"
            href={ROUTES.PORTAL}
          >
            Go home
          </a>
        </div>
      </div>
    </body>
  </html>
);

export default GlobalErrorPage;
