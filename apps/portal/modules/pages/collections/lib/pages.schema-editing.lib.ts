import type {
  PageOptionColor,
  PagePropertyOption,
  PagePropertyType,
  PageViewConfiguration,
  PageViewType,
} from '@company-brain/shared';
import {
  buildPagePropertyKey,
  canPagePropertyGroupBoard,
  isTitlePageProperty,
  PAGE_PROPERTY_TYPE,
  PAGE_VIEW_TYPE,
  pagePropertyRequiresOptions,
  pageViewRequiresGrouping,
  pageViewSupportsGrouping,
  pickPageOptionColor,
  readPageViewConfiguration,
} from '@company-brain/shared';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

/**
 * A view as it can be sent back, keeping only what its configuration is allowed
 * to hold.
 *
 * The shape of a collection travels whole, views included, even when only a
 * property changed. Sending a configuration back exactly as it arrived would
 * fail on any collection whose views were written with something the server no
 * longer accepts, and the property nobody touched would take the change down
 * with it.
 */
export const toSavableView = (view: PageSchemaView): PageSchemaView => ({
  ...view,
  configuration: { ...readPageViewConfiguration(view.configuration) },
});

/**
 * Con qué nace una vista dicho.
 *
 * Nada, salvo si hace columnas: un tablero que no dice por dónde agrupa no
 * dibuja ninguna, y el servidor rechaza la colección entera por él —no solo esa
 * vista—, dejando el panel sin poder guardar nada hasta arreglarlo. Así que
 * nace agrupado por la primera propiedad que sirva, y desde dentro se cambia.
 * Cuando la colección no tiene ninguna que sirva no hay nada que elegir, y eso
 * se dice donde se pueda hacer algo al respecto.
 */
const describeANewView = (
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
): PageSchemaView['configuration'] => {
  /** Un calendario sin fecha no coloca nada, así que nace con la primera que la colección guarde. */
  if (type === PAGE_VIEW_TYPE.CALENDAR) {
    const dateProperty = properties.find((property) => property.type === PAGE_PROPERTY_TYPE.DATE)?.key;
    return dateProperty === undefined ? {} : { dateProperty };
  }
  if (!pageViewRequiresGrouping(type)) return {};
  const groupBy = properties.find((property) => canPagePropertyGroupBoard(property.type))?.key;
  return groupBy === undefined ? {} : { groupBy };
};

/**
 * Otra manera de mirar las mismas filas.
 *
 * Nace sin quedarse con la delantera: la colección ya lleva a algún sitio al
 * abrirse, y agregar una vista no es pedir que se cambie a cuál. El nombre es
 * su dirección, así que dos vistas no pueden llamarse igual ni diferenciarse
 * por un espacio que nadie ve.
 */
export const addSchemaView = (
  views: readonly PageSchemaView[],
  added: { readonly name: string; readonly type: PageViewType },
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaView[] => {
  const named = added.name.trim();
  if (named === '' || views.some((view) => view.name === named)) return views;
  return [
    ...views,
    { configuration: describeANewView(added.type, properties), isDefault: false, name: named, type: added.type },
  ];
};

/**
 * Un nombre libre parecido al que se copió: «Tabla (2)», y si ese ya está, el
 * siguiente. El nombre es la dirección de la vista, así que dos no pueden
 * llamarse igual.
 */
const nameTheCopyOf = (name: string, views: readonly PageSchemaView[]): string => {
  const taken = new Set(views.map((view) => view.name));
  let attempt = 2;
  while (taken.has(`${name} (${attempt})`)) attempt += 1;
  return `${name} (${attempt})`;
};

/**
 * La misma vista otra vez, para cambiarle algo sin perder la que ya estaba.
 *
 * Copia todo lo que la vista dice de sí misma —qué filtra, cómo ordena, qué
 * enseña— porque quien duplica quiere partir de ahí y no de cero. Queda pegada
 * a la original, que es donde se la busca, y nunca se lleva la delantera:
 * abrir la colección lleva a un sitio y no a dos.
 */
export const duplicateSchemaView = (views: readonly PageSchemaView[], name: string): readonly PageSchemaView[] => {
  const from = views.findIndex((view) => view.name === name);
  const original = views[from];
  if (original === undefined) return views;
  const copy: PageSchemaView = {
    configuration: { ...original.configuration },
    isDefault: false,
    name: nameTheCopyOf(name, views),
    type: original.type,
  };
  return [...views.slice(0, from + 1), copy, ...views.slice(from + 1)];
};

/**
 * Lo que se pierde al cambiar una vista de clase.
 *
 * Solo lo que la clase nueva no sabe dibujar de ninguna manera. Lo que
 * simplemente no usa —el ancho de las columnas en un tablero— se queda donde
 * está: ir a tablero y volver no tiene por qué costar el trabajo hecho.
 */
export const listWhatConvertingDrops = (view: PageSchemaView, type: PageViewType): readonly string[] => {
  const configuration = readPageViewConfiguration(view.configuration);
  const dropped: string[] = [];
  if (configuration.subGroupBy !== null && type !== PAGE_VIEW_TYPE.BOARD) dropped.push('BANDS');
  if (configuration.groupBy !== null && !pageViewSupportsGrouping(type)) dropped.push('GROUPING');
  return dropped;
};

/**
 * Por dónde agrupa la vista después de cambiar de clase.
 *
 * Se respeta lo que ya decía mientras la clase nueva lo entienda. Si no lo
 * entiende, se va; si lo necesita y no lo había, se rellena con la primera
 * propiedad que sirva.
 */
const regroupForConversion = (
  configuration: PageViewConfiguration,
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
  dropped: readonly string[],
): { readonly groupBy?: null | string } => {
  if (dropped.includes('GROUPING')) return { groupBy: null };
  if (configuration.groupBy !== null) return {};
  return describeANewView(type, properties);
};

/**
 * Las mismas filas miradas de otra manera, sin volver a decir cómo mirarlas.
 *
 * Cambiar de clase no toca las filas: lo que cambia es qué dibuja la vista. Se
 * queda todo lo que la clase nueva sigue entendiendo, y lo que no —las bandas
 * fuera de un tablero— se va. Lo que la clase nueva necesita y no había —la
 * agrupación de un tablero— se rellena, porque una vista que no se puede
 * dibujar tumbaría al guardar la colección entera.
 */
export const convertSchemaView = (
  views: readonly PageSchemaView[],
  name: string,
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaView[] =>
  views.map((view) => {
    if (view.name !== name || view.type === type) return view;
    const configuration = readPageViewConfiguration(view.configuration);
    const dropped = listWhatConvertingDrops(view, type);
    return {
      ...view,
      configuration: {
        ...configuration,
        ...regroupForConversion(configuration, type, properties, dropped),
        ...(dropped.includes('BANDS') ? { subGroupBy: null } : {}),
      },
      type,
    };
  });

/**
 * Renombra una vista.
 *
 * El nombre es su dirección, así que renombrarla deja apuntando a la nada
 * cualquier enlace escrito con el nombre viejo. No se rompe nada: una dirección
 * que nombra una vista que ya no existe abre la colección por la suya, que es
 * mejor que una pantalla vacía. Aun así se avisa antes de hacerlo.
 */
export const renameSchemaView = (
  views: readonly PageSchemaView[],
  name: string,
  renamedTo: string,
): readonly PageSchemaView[] => {
  const named = renamedTo.trim();
  if (named === '' || views.some((view) => view.name === named)) return views;
  return views.map((view) => (view.name === name ? { ...view, name: named } : view));
};

/**
 * Cambia de sitio una vista entre sus hermanas.
 *
 * El orden de aquí es el orden de las pestañas, que es lo que decide qué se ve
 * primero al mirar la colección. No decide con cuál se abre: eso se dice
 * aparte, porque poner una vista la primera y abrir por ella son dos cosas que
 * a veces se quieren por separado.
 */
export const moveSchemaView = (
  views: readonly PageSchemaView[],
  name: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaView[] => {
  const from = views.findIndex((view) => view.name === name);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= views.length) return views;
  const moved = [...views];
  const [taken] = moved.splice(from, 1);
  if (taken === undefined) return views;
  moved.splice(to, 0, taken);
  return moved;
};

export const addSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  added: { readonly label: string; readonly type: PagePropertyType },
): readonly PageSchemaProperty[] => [
  ...properties,
  {
    key: buildPagePropertyKey(added.label, properties),
    label: added.label,
    options: pagePropertyRequiresOptions(added.type) ? [] : null,
    required: false,
    type: added.type,
  },
];

/**
 * Cambia de sitio una propiedad entre sus hermanas.
 *
 * Este orden es el de la colección, así que manda en todas las vistas que no
 * eligieron el suyo: cambiarlo aquí reordena las columnas de esas tablas y lo
 * que dicen esas tarjetas, sin tocar a quien sí eligió.
 *
 * La del nombre se queda donde está: va siempre primera —es la que abre cada
 * fila—, así que moverla no significaría nada y llevar otra por delante de ella
 * tampoco.
 */
export const moveSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaProperty[] => {
  const from = properties.findIndex((property) => property.key === key);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  const taken = properties[from];
  const displaced = properties[to];
  if (taken === undefined || displaced === undefined) return properties;
  if (isTitlePageProperty(taken.type) || isTitlePageProperty(displaced.type)) return properties;
  const moved = [...properties];
  moved.splice(from, 1);
  moved.splice(to, 0, taken);
  return moved;
};

/**
 * Removes a property, unless it is the one that names each row.
 *
 * A collection without a title has no way to open its rows, and the server
 * refuses a shape without exactly one. Refusing here says so before the trip.
 */
export const removeSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
): readonly PageSchemaProperty[] => {
  const target = properties.find((property) => property.key === key);
  if (target === undefined || isTitlePageProperty(target.type)) return properties;
  return properties.filter((property) => property.key !== key);
};

/**
 * El tipo que nombra lo elegido en un desplegable, si nombra uno que se pueda
 * poner. Un desplegable entrega texto suelto, y de ahí a un tipo del esquema hay
 * que pasar mirando la lista, no afirmándolo.
 */
export const readAddablePropertyType = (chosen: string): PagePropertyType | undefined =>
  PAGE_ADDABLE_PROPERTY_TYPES.find((candidate) => candidate === chosen);

/**
 * La lista de opciones que le toca a una propiedad al cambiar de tipo.
 *
 * Entre una selección y una selección múltiple la lista es la misma —se elige
 * de ella igual, una respuesta o varias—, así que se queda tal cual. Hacia un
 * tipo que no elige de una lista se descarta, y hacia uno que sí, se empieza
 * vacía para que quien cambió el tipo diga qué se puede elegir.
 */
const carryOptionsInto = (
  property: PageSchemaProperty,
  type: PagePropertyType,
): readonly PagePropertyOption[] | null => {
  if (!pagePropertyRequiresOptions(type)) return null;
  return property.options ?? [];
};

/**
 * Cambia de qué tipo es una propiedad, dejándola donde está.
 *
 * La clave no se toca: es donde cada fila tiene escrito lo suyo, y moverla
 * dejaría esos valores huérfanos. Lo que las filas ya guardaron se queda como
 * está, igual que al renombrar una opción — alcanzarlas desde aquí costaría un
 * viaje por fila —, así que quien cambia el tipo vuelve a responder las que
 * queden con la forma anterior.
 *
 * El título queda fuera por los dos lados: ni deja de serlo ni otra propiedad
 * pasa a serlo, porque el servidor pide exactamente uno y sin él no hay manera
 * de abrir una fila.
 */
export const changeSchemaPropertyType = (
  properties: readonly PageSchemaProperty[],
  key: string,
  type: PagePropertyType,
): readonly PageSchemaProperty[] => {
  if (isTitlePageProperty(type)) return properties;
  const target = properties.find((property) => property.key === key);
  if (target === undefined || isTitlePageProperty(target.type)) return properties;
  return properties.map((property) =>
    property.key === key ? { ...property, options: carryOptionsInto(property, type), type } : property,
  );
};

export const updateSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
  changes: Partial<Pick<PageSchemaProperty, 'label' | 'required'>>,
): readonly PageSchemaProperty[] =>
  properties.map((property) => (property.key === key ? { ...property, ...changes } : property));

const withOptions = (
  properties: readonly PageSchemaProperty[],
  key: string,
  rewrite: (options: readonly PagePropertyOption[]) => readonly PagePropertyOption[] | null,
): readonly PageSchemaProperty[] =>
  properties.map((property) => {
    if (property.key !== key || property.options === null) return property;
    const rewritten = rewrite(property.options);
    return rewritten === null ? property : { ...property, options: rewritten };
  });

/**
 * Si ese nombre ya lo lleva otra opción de la misma propiedad.
 *
 * Dos opciones con el mismo nombre serían dos columnas respondiendo a lo mismo,
 * y ninguna fila sabría en cuál está. Se pregunta antes de mandarlo para poder
 * decir qué pasa, en vez de recibir de vuelta un «algo salió mal».
 */
export const isSchemaOptionNameTaken = (
  properties: readonly PageSchemaProperty[],
  key: string,
  name: string,
): boolean => {
  const named = name.trim();
  const options = properties.find((property) => property.key === key)?.options ?? [];
  return options.some((option) => option.value === named);
};

/** Adds a choice, with a color of its own so a board tells one column from the next. */
export const addSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const named = value.trim();
    if (named === '' || options.some((option) => option.value === named)) return null;
    return [...options, { color: pickPageOptionColor(options.length), value: named }];
  });

/**
 * Renames a choice in the shape.
 *
 * What the rows already stored keeps the old name: the value lives on each row,
 * and reaching every row from here would take a trip per row. Whoever renames is
 * told what it costs before doing it.
 */
export const renameSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  renamedTo: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const named = renamedTo.trim();
    if (named === '' || options.some((option) => option.value === named)) return null;
    return options.map((option) => (option.value === value ? { ...option, value: named } : option));
  });

export const updateSchemaOptionColor = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  color: PageOptionColor | null,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) =>
    options.map((option) => (option.value === value ? { ...option, color } : option)),
  );

const placeOptionAt = (
  options: readonly PagePropertyOption[],
  value: string,
  at: number,
): readonly PagePropertyOption[] | null => {
  const taken = options.find((option) => option.value === value);
  if (taken === undefined || at === -1) return null;
  const rest = options.filter((option) => option.value !== value);
  return [...rest.slice(0, at), taken, ...rest.slice(at)];
};

/**
 * Cambia una opción de sitio, poniéndola justo antes de otra.
 *
 * Se dice «antes de cuál» y no «cuántos puestos», porque lo que se hace al
 * arrastrar es soltar en un hueco entre dos, y ese hueco se nombra por lo que
 * queda a su derecha. Soltarla al final es no tener nada a la derecha.
 */
export const moveSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  beforeValue: null | string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    if (value === beforeValue) return null;
    const rest = options.filter((option) => option.value !== value);
    const at = beforeValue === null ? rest.length : rest.findIndex((option) => option.value === beforeValue);
    return placeOptionAt(options, value, at);
  });

/** Un puesto a un lado o al otro, que es lo que significa moverla con el teclado. */
export const moveSchemaOptionSideways = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const from = options.findIndex((option) => option.value === value);
    const at = direction === 'EARLIER' ? from - 1 : from + 1;
    if (from === -1 || at < 0 || at >= options.length) return null;
    return placeOptionAt(options, value, at);
  });

export const removeSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => options.filter((option) => option.value !== value));
