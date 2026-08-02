'use client';

import Link from 'next/link';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: IProps) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
    <h1 className="font-semibold text-2xl">Algo salió mal</h1>
    <p className="max-w-md text-center text-neutral-500 text-sm">
      {error.message || 'Ocurrió un error al cargar esta página. Vuelve a intentarlo o regresa al inicio.'}
    </p>
    <div className="flex items-center gap-2">
      <button
        className="rounded-none bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        onClick={reset}
        type="button"
      >
        Reintentar
      </button>
      <Link
        className="rounded-none border border-neutral-300 px-4 py-2 text-neutral-700 text-sm hover:bg-neutral-100"
        href={ROUTES.PORTAL}
      >
        Ir al inicio
      </Link>
    </div>
  </div>
);

export default ErrorPage;
