import type { PageOptionColor, PagePropertyOption, PagePropertyType, PageViewType } from '@company-brain/shared';
import {
  canPagePropertyGroupBoard,
  isTitlePageProperty,
  pagePropertyRequiresOptions,
  pageViewRequiresGrouping,
  pickPageOptionColor,
  readPageViewConfiguration,
} from '@company-brain/shared';
import {
  PAGE_ADDABLE_PROPERTY_TYPES,
  PAGE_PROPERTY_KEY_COMBINING_MARKS,
  PAGE_PROPERTY_KEY_DIGIT_PREFIX,
  PAGE_PROPERTY_KEY_EDGE_UNDERSCORES,
  PAGE_PROPERTY_KEY_FALLBACK,
  PAGE_PROPERTY_KEY_MAX_LENGTH,
  PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE,
  PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT,
} from '../constants/pages.schema-editing.constants';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

const toBareKey = (label: string): string => {
  const plain = label
    .normalize('NFD')
    .replace(PAGE_PROPERTY_KEY_COMBINING_MARKS, '')
    .toLowerCase()
    .replace(PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE, '_')
    .replace(PAGE_PROPERTY_KEY_EDGE_UNDERSCORES, '')
    .slice(0, PAGE_PROPERTY_KEY_MAX_LENGTH);
  if (plain === '') return PAGE_PROPERTY_KEY_FALLBACK;
  return PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT.test(plain) ? `${PAGE_PROPERTY_KEY_DIGIT_PREFIX}${plain}` : plain;
};

/**
 * The key a property is stored under, made from the name somebody typed.
 *
 * The key never changes once a row has written something under it, so it is
 * built to survive: no accents, no spaces, nothing the server would refuse. A
 * name already taken gets a number rather than landing on somebody else's
 * values.
 */
export const buildPropertyKey = (label: string, properties: readonly PageSchemaProperty[]): string => {
  const bare = toBareKey(label);
  const taken = new Set(properties.map((property) => property.key));
  if (!taken.has(bare)) return bare;
  let attempt = 2;
  while (taken.has(`${bare}_${String(attempt)}`)) attempt += 1;
  return `${bare}_${String(attempt)}`;
};

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
 * Quita una manera de mirar, salvo que sea la última.
 *
 * Sin ninguna vista las filas no se pueden mirar, y el servidor tampoco acepta
 * una colección así. Si la que se va era la que llevaba la delantera, otra la
 * toma: si no, abrir la colección no llevaría a ninguna parte.
 */
export const removeSchemaView = (views: readonly PageSchemaView[], name: string): readonly PageSchemaView[] => {
  if (views.length <= 1 || !views.some((view) => view.name === name)) return views;
  const remaining = views.filter((view) => view.name !== name);
  if (remaining.some((view) => view.isDefault)) return remaining;
  return remaining.map((view, position) => (position === 0 ? { ...view, isDefault: true } : view));
};

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

/** Con cuál se abre la colección. Exactamente una la lleva, porque abrirla lleva a un sitio y no a dos. */
export const makeSchemaViewDefault = (views: readonly PageSchemaView[], name: string): readonly PageSchemaView[] => {
  if (!views.some((view) => view.name === name)) return views;
  return views.map((view) => ({ ...view, isDefault: view.name === name }));
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
    key: buildPropertyKey(added.label, properties),
    label: added.label,
    options: pagePropertyRequiresOptions(added.type) ? [] : null,
    required: false,
    type: added.type,
  },
];

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

export const removeSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => options.filter((option) => option.value !== value));
