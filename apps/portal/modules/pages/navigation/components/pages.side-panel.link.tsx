'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { buildPagesSidePanelQueryHref } from '../lib/pages.side-panel.lib';

interface IProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly pageId: string;
}

/**
 * Lo que abre una página al costado de la que ya se está leyendo.
 *
 * Es un enlace de verdad, con su dirección escrita, para que la página abierta
 * al costado se pueda mandar por link, recuperar con el botón de atrás o abrir
 * en otra pestaña. Y es la dirección entera la que viaja —vista, filtro, lo que
 * hubiera—, cambiando solo cuál es la página del costado.
 *
 * No mueve la página de sitio: quien abre una tarjeta que estaba a media
 * pantalla la sigue mirando donde estaba, y el panel entra al costado sin
 * llevarse el resto por delante.
 */
export const PagesSidePanelLink = ({ children, className, pageId }: IProps) => {
  const searchParams = useSearchParams();

  return (
    <Link className={className} href={buildPagesSidePanelQueryHref(searchParams.toString(), pageId)} scroll={false}>
      {children}
    </Link>
  );
};
