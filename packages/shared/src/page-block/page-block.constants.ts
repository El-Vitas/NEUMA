/** Bloques cuya primera línea es el bloque mismo: se nombran y se leen por el ítem, no por esa línea. */
export const PAGE_BLOCK_ITEM_TYPES: readonly string[] = ['list_item', 'task_item'];

/** Bloques que se leen enteros, como uno solo: lo de adentro no se señala por separado. */
export const PAGE_BLOCK_WHOLE_TYPES: readonly string[] = ['table'];

/** Bloques que dicen lo suyo en un atributo y no en su contenido. */
export const PAGE_BLOCK_TEXT_ATTRIBUTES: Readonly<Partial<Record<string, string>>> = { toggle: 'summary' };

/** Lo que un nodo en línea deja leer, por su tipo: el texto del nodo, o el atributo que lo nombra. */
export const PAGE_BLOCK_INLINE_TEXT_ATTRIBUTES: Readonly<Partial<Record<string, string>>> = {
  date: 'at',
  mention: 'label',
  person: 'label',
};
