import type { ComponentProps } from 'react';

/**
 * Una tabla del manual, dentro de la caja por la que se desplaza.
 *
 * El desplazamiento va en la caja y no en la tabla: una tabla a la que se le
 * pide desplazarse deja de repartir el ancho entre sus columnas, y una de dos
 * columnas queda encogida a la izquierda con el resto del marco vacío.
 */
export const DocsTable = ({ children }: ComponentProps<'table'>) => (
  <div className="overflow-x-auto">
    <table className="w-full">{children}</table>
  </div>
);
