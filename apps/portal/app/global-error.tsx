'use client';

import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * What is left when even the layout could not be drawn.
 *
 * It carries its own document and its own colours because nothing around it is
 * standing, and like every other screen of its kind it says what happened
 * without repeating what the machine said.
 */
const GlobalErrorPage = ({ error, reset }: IProps) => (
  <html lang="en">
    <body className="bg-white text-neutral-900">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-center font-semibold text-2xl">This page could not be opened</h1>
        <p className="max-w-prose text-center text-neutral-500 text-sm">
          Something on our side stopped working. Your writing is safe. Try again, and if it keeps happening, tell us the
          reference below.
        </p>
        <div className="flex items-center gap-2">
          <button
            className="min-h-11 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <a
            className="min-h-11 border border-neutral-300 px-4 py-2 text-neutral-700 text-sm hover:bg-neutral-100"
            href={ROUTES.PORTAL}
          >
            Go to the start
          </a>
        </div>
        {error.digest === undefined ? null : <p className="text-neutral-400 text-xs">{`Reference: ${error.digest}`}</p>}
      </div>
    </body>
  </html>
);

export default GlobalErrorPage;
