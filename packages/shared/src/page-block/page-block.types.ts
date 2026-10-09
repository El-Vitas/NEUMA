/**
 * Un bloque de una página, tal como se lo señala y se lo busca.
 *
 * Es lo que se proyecta a `PageBlock` y a la búsqueda: con su id se llega a él
 * y con su ruta de encabezados se sabe en qué sección está.
 */
export interface PageBlockEntry {
  /** Los encabezados bajo los que está, del más externo al más cercano. */
  readonly headingPath: readonly string[];
  readonly id: string;
  /** El bloque con id más cercano que lo contiene, o nada si está en la raíz de la página. */
  readonly parentId: string | null;
  /** Su lugar en el orden en que se lee la página, desde cero. */
  readonly position: number;
  /** Lo que dice el bloque mismo, sin lo que dicen los bloques que lleva dentro. */
  readonly text: string;
  readonly type: string;
}
