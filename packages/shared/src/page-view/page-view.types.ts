import type { PagePropertyValue } from '../page-property/page-property.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';

export type PageFilterOperator =
  | 'IS'
  | 'IS_NOT'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'IS_GREATER_THAN'
  | 'IS_LESS_THAN'
  | 'IS_BEFORE'
  | 'IS_AFTER';

export const PAGE_FILTER_OPERATOR = {
  IS: 'IS',
  IS_NOT: 'IS_NOT',
  CONTAINS: 'CONTAINS',
  NOT_CONTAINS: 'NOT_CONTAINS',
  IS_EMPTY: 'IS_EMPTY',
  IS_NOT_EMPTY: 'IS_NOT_EMPTY',
  IS_GREATER_THAN: 'IS_GREATER_THAN',
  IS_LESS_THAN: 'IS_LESS_THAN',
  IS_BEFORE: 'IS_BEFORE',
  IS_AFTER: 'IS_AFTER',
} as const satisfies Record<PageFilterOperator, PageFilterOperator>;

export const PAGE_FILTER_OPERATOR_VALUES = [
  PAGE_FILTER_OPERATOR.IS,
  PAGE_FILTER_OPERATOR.IS_NOT,
  PAGE_FILTER_OPERATOR.CONTAINS,
  PAGE_FILTER_OPERATOR.NOT_CONTAINS,
  PAGE_FILTER_OPERATOR.IS_EMPTY,
  PAGE_FILTER_OPERATOR.IS_NOT_EMPTY,
  PAGE_FILTER_OPERATOR.IS_GREATER_THAN,
  PAGE_FILTER_OPERATOR.IS_LESS_THAN,
  PAGE_FILTER_OPERATOR.IS_BEFORE,
  PAGE_FILTER_OPERATOR.IS_AFTER,
] as const;

export type PageFilterGroupOperator = 'AND' | 'OR';

export const PAGE_FILTER_GROUP_OPERATOR = {
  AND: 'AND',
  OR: 'OR',
} as const satisfies Record<PageFilterGroupOperator, PageFilterGroupOperator>;

export interface PageFilterCondition {
  readonly kind: 'CONDITION';
  readonly propertyKey: string;
  readonly operator: PageFilterOperator;
  readonly value: PagePropertyValue | null;
}

export interface PageFilterGroup {
  readonly kind: 'GROUP';
  readonly operator: PageFilterGroupOperator;
  readonly conditions: readonly PageFilter[];
}

export type PageFilter = PageFilterCondition | PageFilterGroup;

/**
 * Cuántos niveles admite un filtro, contando la condición como uno.
 *
 * Un grupo con condiciones dentro son dos, y un grupo dentro de ese son tres:
 * eso es lo hondo que se puede llegar. Más adentro, lo que se lee ya no es una
 * condición sino un paréntesis dentro de otro paréntesis, y quien lo escribió
 * deja de poder decir en una frase qué deja pasar.
 */
export const PAGE_FILTER_MAXIMUM_DEPTH = 3;

export type PageSortDirection = 'ASCENDING' | 'DESCENDING';

export const PAGE_SORT_DIRECTION = {
  ASCENDING: 'ASCENDING',
  DESCENDING: 'DESCENDING',
} as const satisfies Record<PageSortDirection, PageSortDirection>;

export const PAGE_SORT_DIRECTION_VALUES = [PAGE_SORT_DIRECTION.ASCENDING, PAGE_SORT_DIRECTION.DESCENDING] as const;

export interface PageSort {
  readonly propertyKey: string;
  readonly direction: PageSortDirection;
}

/**
 * Lo que una columna dice de todas sus filas juntas, escrito bajo ellas.
 *
 * Contar sirve para cualquier columna, porque toda respuesta está o no está.
 * Lo demás depende de qué guarda: sumar fechas no significa nada, y el
 * porcentaje marcado solo lo tiene una casilla.
 */
export type PageViewCalculation =
  | 'NONE'
  | 'COUNT_ALL'
  | 'COUNT_EMPTY'
  | 'COUNT_FILLED'
  | 'SUM'
  | 'AVERAGE'
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'MEDIAN'
  | 'PERCENT_CHECKED';

export const PAGE_VIEW_CALCULATION = {
  NONE: 'NONE',
  COUNT_ALL: 'COUNT_ALL',
  COUNT_EMPTY: 'COUNT_EMPTY',
  COUNT_FILLED: 'COUNT_FILLED',
  SUM: 'SUM',
  AVERAGE: 'AVERAGE',
  MINIMUM: 'MINIMUM',
  MAXIMUM: 'MAXIMUM',
  MEDIAN: 'MEDIAN',
  PERCENT_CHECKED: 'PERCENT_CHECKED',
} as const satisfies Record<PageViewCalculation, PageViewCalculation>;

export const PAGE_VIEW_CALCULATION_VALUES = [
  PAGE_VIEW_CALCULATION.NONE,
  PAGE_VIEW_CALCULATION.COUNT_ALL,
  PAGE_VIEW_CALCULATION.COUNT_EMPTY,
  PAGE_VIEW_CALCULATION.COUNT_FILLED,
  PAGE_VIEW_CALCULATION.SUM,
  PAGE_VIEW_CALCULATION.AVERAGE,
  PAGE_VIEW_CALCULATION.MINIMUM,
  PAGE_VIEW_CALCULATION.MAXIMUM,
  PAGE_VIEW_CALCULATION.MEDIAN,
  PAGE_VIEW_CALCULATION.PERCENT_CHECKED,
] as const;

/**
 * En qué tramo caen las filas cuando se agrupa por una fecha.
 *
 * Sin tramo, una fecha hace un grupo por día distinto que alguna fila nombró, y
 * un año de trabajo son trescientos grupos de una fila. El tramo dice cuánto
 * cabe en cada grupo sin cambiar lo que las filas guardan.
 */
export type PageDateBucket = 'DAY' | 'WEEK' | 'MONTH';

export const PAGE_DATE_BUCKET = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
} as const satisfies Record<PageDateBucket, PageDateBucket>;

export const PAGE_DATE_BUCKET_VALUES = [PAGE_DATE_BUCKET.DAY, PAGE_DATE_BUCKET.WEEK, PAGE_DATE_BUCKET.MONTH] as const;

/**
 * Cuánto alto se le da a cada fila de una tabla.
 *
 * Corta manda mucho en la pantalla: se ven más filas de una vez, que es lo que
 * casi siempre se viene a hacer. Alta sirve cuando lo que las filas guardan es
 * texto para leer y no datos para comparar.
 */
export type PageRowHeight = 'SHORT' | 'MEDIUM' | 'TALL';

export const PAGE_ROW_HEIGHT = {
  SHORT: 'SHORT',
  MEDIUM: 'MEDIUM',
  TALL: 'TALL',
} as const satisfies Record<PageRowHeight, PageRowHeight>;

export const PAGE_ROW_HEIGHT_VALUES = [PAGE_ROW_HEIGHT.SHORT, PAGE_ROW_HEIGHT.MEDIUM, PAGE_ROW_HEIGHT.TALL] as const;

/**
 * Cómo se dibuja un gráfico.
 *
 * Barras para comparar cuánto hay en cada grupo, que es lo que casi siempre se
 * viene a mirar; línea cuando los grupos son un antes y un después —los tramos
 * de una fecha— y lo que importa es hacia dónde va; y pastel cuando lo que se
 * pregunta es qué parte del total se lleva cada uno.
 */
export type PageChartKind = 'BAR' | 'LINE' | 'PIE';

export const PAGE_CHART_KIND = {
  BAR: 'BAR',
  LINE: 'LINE',
  PIE: 'PIE',
} as const satisfies Record<PageChartKind, PageChartKind>;

export const PAGE_CHART_KIND_VALUES = [PAGE_CHART_KIND.BAR, PAGE_CHART_KIND.LINE, PAGE_CHART_KIND.PIE] as const;

/**
 * Qué dice de cada grupo la altura de su barra.
 *
 * Contar filas no pregunta por ninguna propiedad y por eso es lo que un gráfico
 * hace cuando nadie eligió nada. Sumar y promediar sí: necesitan una propiedad
 * numérica, y sin ella no se ofrecen.
 */
export type PageChartMeasure = 'COUNT' | 'SUM' | 'AVERAGE';

export const PAGE_CHART_MEASURE = {
  COUNT: 'COUNT',
  SUM: 'SUM',
  AVERAGE: 'AVERAGE',
} as const satisfies Record<PageChartMeasure, PageChartMeasure>;

export const PAGE_CHART_MEASURE_VALUES = [
  PAGE_CHART_MEASURE.COUNT,
  PAGE_CHART_MEASURE.SUM,
  PAGE_CHART_MEASURE.AVERAGE,
] as const;

/** Hacia qué lado se pega lo que dice una columna. */
export type PageColumnAlignment = 'START' | 'CENTER' | 'END';

export const PAGE_COLUMN_ALIGNMENT = {
  START: 'START',
  CENTER: 'CENTER',
  END: 'END',
} as const satisfies Record<PageColumnAlignment, PageColumnAlignment>;

export const PAGE_COLUMN_ALIGNMENT_VALUES = [
  PAGE_COLUMN_ALIGNMENT.START,
  PAGE_COLUMN_ALIGNMENT.CENTER,
  PAGE_COLUMN_ALIGNMENT.END,
] as const;

/** Un día de la rejilla de un mes: qué día es, y si pertenece al mes que se mira o al de al lado. */
export interface PageCalendarDay {
  readonly date: string;
  readonly isOfTheMonth: boolean;
}

export interface PageViewProperty {
  readonly key: string;
  readonly type: PagePropertyType;
}

export interface PageViewConfiguration {
  /**
   * El emoji con el que se reconoce la vista en su pestaña, o nada.
   *
   * Es de la vista y no de la colección: lo que distingue a una pestaña de la de
   * al lado. Un emoji y no una imagen, porque una pestaña mide lo que mide una
   * línea de texto y una foto ahí no se lee.
   */
  readonly icon: string | null;
  readonly groupBy: string | null;
  /**
   * La segunda agrupación, que cruza a la primera.
   *
   * Con las dos puestas, las filas no salen en columnas sino en una rejilla:
   * `groupBy` hace las columnas y esta hace las bandas que las atraviesan, de
   * modo que cada cruce es un sitio donde soltar. Cuál va en qué eje lo decide
   * quién ocupa cada campo, así que intercambiarlos es cambiarlos de sitio.
   */
  readonly subGroupBy: string | null;
  /**
   * En qué tramo caen las filas cuando se agrupa por una fecha. No dice nada
   * cuando se agrupa por otra cosa: un día no es un tramo de una selección.
   */
  readonly groupByDateBucket: PageDateBucket;
  /**
   * Por qué fecha se ubica cada fila en un calendario.
   *
   * Va aparte de `groupBy` porque no es lo mismo: agrupar hace montones con un
   * nombre, y aquí lo que se hace es poner cada fila en el día que dice. Una
   * colección puede guardar varias fechas —cuándo empieza, cuándo vence— y el
   * calendario enseña una de ellas cada vez.
   */
  readonly dateProperty: string | null;
  readonly filter: PageFilter | null;
  readonly sorts: readonly PageSort[];
  /**
   * Which properties this view shows, in the order it shows them. Nothing means
   * all of them; an empty list means somebody chose to show none.
   */
  readonly visibleProperties: readonly string[] | null;
  /** Qué dice al pie cada columna, por la clave de la propiedad que la columna es. */
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  /**
   * Qué grupos están plegados, por el valor que cada uno es: las columnas de un
   * tablero, las franjas de una tabla agrupada.
   *
   * Es de la vista y no del valor: plegar un grupo es dejar de mirarlo, no decir
   * algo sobre lo que guarda, y quien mire las mismas filas en otra vista no
   * tiene por qué estar mirando lo mismo.
   */
  readonly collapsedGroups: readonly string[];
  /** Cuántas tarjetas se espera que tenga cada columna, por el valor que la columna es. */
  readonly columnLimits: Readonly<Record<string, number>>;
  /** Qué ancho se le dio a cada columna de una tabla, en píxeles y por la propiedad que la columna es. */
  readonly columnWidths: Readonly<Record<string, number>>;
  /**
   * Cuántas columnas de la izquierda se quedan quietas al desplazarse a lo
   * ancho, contando la del nombre como la primera. Cero es que no se queda
   * ninguna.
   */
  readonly frozenColumns: number;
  /**
   * Si los grupos sin ninguna fila se dejan de mostrar.
   *
   * Es de la vista: un grupo vacío sigue existiendo —es un valor que la
   * propiedad admite—, y lo que se pide es no verlo mientras nadie lo haya
   * elegido. En un tablero eso se paga con un sitio menos donde soltar una
   * tarjeta, y por eso se pide en vez de darse por hecho.
   */
  readonly hidesEmptyGroups: boolean;
  /** Si la columna de las filas sin valor se deja de mostrar. */
  readonly hidesUnassignedColumn: boolean;
  /** Cuánto alto tiene cada fila de la tabla. */
  readonly rowHeight: PageRowHeight;
  /**
   * Si el texto largo se parte en varias líneas en vez de cortarse.
   *
   * Cortado se lee la tabla de un vistazo; partido se lee lo que dice cada
   * fila. Por eso va con el alto: uno sin el otro deja el texto partido dentro
   * de una fila que no crece.
   */
  readonly wrapsText: boolean;
  /** Hacia qué lado se pega cada columna, por la propiedad que la columna es. */
  readonly columnAlignments: Readonly<Record<string, PageColumnAlignment>>;
  /** Cómo se dibuja un gráfico. No dice nada en las vistas que no lo son. */
  readonly chartKind: PageChartKind;
  readonly chartMeasure: PageChartMeasure;
  /**
   * Qué propiedad se suma o se promedia. Nada cuando lo que se hace es contar
   * filas, que no pregunta por ninguna.
   */
  readonly chartValueProperty: string | null;
}
