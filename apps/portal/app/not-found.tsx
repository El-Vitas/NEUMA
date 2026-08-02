import Link from 'next/link';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
    <h1 className="font-semibold text-2xl">Página no encontrada</h1>
    <p className="max-w-md text-center text-neutral-500 text-sm">
      La página que buscas no existe o fue movida. Verifica la dirección o regresa al inicio.
    </p>
    <Link
      className="rounded-none bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
      href={ROUTES.PORTAL}
    >
      Ir al inicio
    </Link>
  </div>
);

export default NotFoundPage;
