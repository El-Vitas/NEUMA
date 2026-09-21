export const PAGE_ATTACHMENTS_CLEANUP_REPOSITORY = 'PAGE_ATTACHMENTS_CLEANUP_REPOSITORY';
export const PAGE_REPOSITORY = 'PAGE_REPOSITORY';
export const PAGE_SCHEMA_REPOSITORY = 'PAGE_SCHEMA_REPOSITORY';
export const REDACTED_MENTION_LABEL = 'Restricted page';

/**
 * The order sisters are read in.
 *
 * Two pages made at the same moment can end up carrying the same number, since
 * the next number is worked out by reading the highest one and adding to it.
 * The moment each was made breaks the tie, so a tree reads the same way twice
 * running instead of however the database felt like answering.
 */
export const PAGE_SIBLING_ORDER = [{ order: 'asc' }, { createdAt: 'asc' }] as const;

/**
 * How many pages of a batch are worked on at the same time.
 *
 * Each one opens a transaction of its own, so the whole selection at once would
 * ask for a hundred connections and there are not a hundred. A batch takes
 * longer this way; everything else keeps running while it does.
 */
export const PAGE_BATCH_CONCURRENCY = 5;

/**
 * Where the files that hang on pages sit inside an export.
 *
 * In one folder of their own rather than beside each page, because the same
 * picture can be shown on several pages and there is only one of it.
 */
export const EXPORT_ATTACHMENTS_FOLDER = 'assets';

/** One page goes out as itself; several go out packed, so the folders can say what hung from what. */
export const EXPORT_MARKDOWN_MEDIA_TYPE = 'text/markdown; charset=utf-8';
export const EXPORT_ARCHIVE_MEDIA_TYPE = 'application/zip';

/** How many pages a loose selection may name at once, so a query cannot ask for the world. */
export const EXPORT_SELECTION_LIMIT = 200;

/**
 * Cuánta forma admite una colección.
 *
 * Son los mismos topes que el portal ya pone antes de mandar, escritos también
 * aquí porque el portal no es el único que puede llamar: quien manda mil
 * propiedades de una vez no lo hace desde la pantalla.
 */
export const SCHEMA_PROPERTY_LIMIT = 50;
export const SCHEMA_VIEW_LIMIT = 20;

/**
 * Cuánto puede medir cada nombre que llega de fuera.
 *
 * Un título es lo que se lee en el costado, en la miga de pan y en el nombre
 * del archivo al exportar, así que el tope es el del sitio más estrecho. La
 * clave de una propiedad es un identificador y no una frase, y por eso se
 * queda corta; su etiqueta, que sí se lee, tiene el largo de un renglón.
 */
export const PAGE_TITLE_MAX_LENGTH = 200;
export const SCHEMA_PROPERTY_KEY_MAX_LENGTH = 64;
export const SCHEMA_LABEL_MAX_LENGTH = 120;

/** Cómo se llama una página sin nombre en el archivo exportado, dicho en el idioma de quien lo pide. */
export const EXPORT_UNTITLED_LABEL_MAX_LENGTH = 80;

/**
 * Cuántas filas de una colección se traen de una vez.
 *
 * Leer una colección trae sus filas con lo que cada una responde, las agrupa,
 * las filtra y las calcula, y todo eso ocurre en una sola petición. Sin tope,
 * una colección que creció sola —una bandeja de entrada, un registro— pide
 * memoria y tiempo en proporción a lo que guarda, y quien la abre espera por
 * filas que no va a mirar.
 *
 * El tope se dice en la respuesta en vez de callarse, porque una colección que
 * enseña quinientas de mil sin avisar miente sobre lo que hay.
 */
export const COLLECTION_ROW_LIMIT = 500;

/**
 * Lo que contesta reescribir una opción que ya no está donde se la dejó.
 *
 * Renombrar parte de un nombre y llega a la base un rato después de haberlo
 * leído. Si en ese rato otra persona renombró o quitó esa misma opción,
 * escribir encima borraría su cambio sin que nadie se enterara, así que la
 * escritura se deshace y quien lo pidió vuelve a mirar.
 */
export const SCHEMA_OPTION_ALREADY_MOVED = 'SCHEMA_OPTION_ALREADY_MOVED';

export const PAGE_DELETE_FOREVER_OUTCOMES = ['DELETED', 'NOT_FOUND', 'NOT_TRASHED'] as const;
