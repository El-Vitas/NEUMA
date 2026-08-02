import Link from 'next/link';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
    <h1 className="font-semibold text-2xl">Page not found</h1>
    <p className="max-w-md text-center text-neutral-500 text-sm">
      The page you are looking for does not exist or was moved. Check the address or return home.
    </p>
    <Link
      className="rounded-none bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
      href={ROUTES.PORTAL}
    >
      Go home
    </Link>
  </div>
);

export default NotFoundPage;
