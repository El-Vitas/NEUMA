export const MCP_PRINCIPAL_RESOLVER = Symbol('MCP_PRINCIPAL_RESOLVER');
export const MCP_SERVER_DEPENDENCIES = Symbol('MCP_SERVER_DEPENDENCIES');

export const MCP_ROUTE = 'mcp';

/** Con qué se presenta, ante el SDK, quien entra con un token personal. */
export const MCP_ACCESS_TOKEN_CLIENT_ID = 'company-brain-access-token';

export const MCP_SERVER_INFO = { name: 'company-brain', version: '0.1.0' } as const;

/**
 * Los nombres con los que el agente llama a cada herramienta.
 *
 * En minúsculas con guion bajo, que es como los escriben los clientes de MCP y
 * como los recuerda un modelo. Cambiar uno rompe la configuración de quien ya lo
 * usa, así que se eligen una vez.
 */
export const MCP_TOOL_NAMES = {
  createRow: 'create_row',
  createView: 'create_view',
  deleteView: 'delete_view',
  fetch: 'fetch',
  getCollection: 'get_collection',
  listPages: 'list_pages',
  listSpaces: 'list_spaces',
  queryCollection: 'query_collection',
  search: 'search',
  updateCollectionColumns: 'update_collection_columns',
  updateRow: 'update_row',
  updateView: 'update_view',
} as const;

/** Un salto de línea dentro de un párrafo de una página. */
export const MCP_HARD_BREAK_NODE = { type: 'hard_break' } as const;

/** El párrafo vacío con que nace una página sin texto, igual que en el portal. */
export const MCP_EMPTY_PARAGRAPH_NODE = { content: [], type: 'paragraph' } as const;

/** Lo que separa dos párrafos en el texto que el agente escribe: una línea en blanco. */
export const MCP_PARAGRAPH_SEPARATOR = /\n\s*\n/;

/** Un salto de línea dentro de un párrafo. */
export const MCP_LINE_SEPARATOR = /\r?\n/;

/** Un cursor que dice desde qué posición seguir una lista o una página larga. */
export const MCP_OFFSET_CURSOR_PATTERN = /^\d{1,6}$/;

/** Lo que se le dice cuando pasó una página que no tiene columnas. */
export const MCP_NOT_A_COLLECTION_MESSAGE =
  'This page is not a collection: it has no columns. To find the collections, list the spaces with list_spaces and the pages at their top with list_pages: collections are marked as such.';

/** Lo que se le dice cuando pasó, como fila, una página que no cuelga de una colección. */
export const MCP_NOT_A_ROW_MESSAGE =
  'This page is not a row of a collection. A row is a page right under a collection; list_pages or query_collection give their ids.';

/** Lo que se le dice cuando la página está bloqueada contra cambios. */
export const MCP_PAGE_LOCKED_MESSAGE =
  'This page is locked against edits. Ask a person to unlock it in Company Brain before changing it.';

/** Lo que se le dice cuando otra persona cambió lo mismo mientras tanto. */
export const MCP_CONCURRENT_CHANGE_MESSAGE =
  'Somebody changed the same thing a moment ago. Read the collection again with get_collection and retry.';

/** Lo que se le dice cuando pide cambiar algo sin decir qué. */
export const MCP_NOTHING_TO_CHANGE_MESSAGE = 'Nothing to change: say what should change.';

/** Los rechazos que se contestan como un recurso que no está: decir más confirmaría que existe. */
export const MCP_INACCESSIBLE_REFUSAL_CODES: readonly string[] = ['PAGE_ACCESS_DENIED', 'PAGE_SCHEMA_NOT_FOUND'];

export const MCP_LOCKED_REFUSAL_CODE = 'PAGE_LOCKED';

/** Lo que otra persona movió entre que el agente leyó y escribió: una vista que ya no está, una opción ya renombrada. */
export const MCP_CONCURRENT_REFUSAL_CODES: readonly string[] = [
  'PAGE_VIEW_NOT_FOUND',
  'SCHEMA_PROPERTY_DEFINITION_INVALID',
];

/** Cómo empieza lo que se le dice cuando Company Brain rechazó el cambio por lo que pedía. */
export const MCP_REFUSED_CHANGE_PREFIX = 'Company Brain refused the change:';

/** Lo que aparece en lugar de una página que el agente no puede ver: nombrarla ya diría demasiado. */
export const MCP_REDACTED_REFERENCE_LABEL = '[unavailable page]';

/** Lo que apunta a otra página dentro de una línea. */
export const MCP_INLINE_REFERENCE_TYPES: readonly string[] = ['mention'];

/** Lo que muestra el nombre de la página a la que apunta, guardado cuando se escribió. */
export const MCP_LABELED_REFERENCE_TYPES: readonly string[] = ['mention', 'subpage'];

/** Bloques que muestran otra página: su título, un bloque suyo o sus filas. */
export const MCP_BLOCK_REFERENCE_TYPES: readonly string[] = ['collection', 'subpage', 'synced'];

/** Lo que se le dice cuando pidió un bloque que ya no está, y se le entrega la página donde estaba. */
export const MCP_BLOCK_NOT_FOUND_NOTE =
  'The block you asked for is no longer on this page. This is the page it was on, as it is now.';

/** La palabra que queda en lugar de una mención a una página que el agente no puede ver. */
export const MCP_REDACTED_REFERENCE_WORD = { text: MCP_REDACTED_REFERENCE_LABEL, type: 'text' } as const;

/** Las condiciones que no comparan con un valor: preguntan si la celda está vacía o no. */
export const MCP_VALUELESS_FILTER_OPERATORS: readonly string[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];

/** Los acentos, que no cuentan al comparar lo que escribe el agente con un nombre: «Titulo» es «Título». */
export const MCP_ACCENT_MARKS = /\p{M}/gu;

/** Dónde dice la página en la ruta de un enlace del portal: `/spaces/<espacio>/pages/<página>`. */
export const MCP_PAGE_IN_PATH_PATTERN = /\/pages\/([^/?#\s]+)/;

/** Lo que se le dice cuando pide listar páginas sin decir de dónde. */
export const MCP_LIST_PAGES_PLACE_MESSAGE =
  'Say where to list from: pass a spaceId for the pages at the top of a space, or a parentPageId for the pages under a page.';

/** Lo que se le dice cuando lo que pasó no es un enlace ni un id de Company Brain. */
export const MCP_UNREADABLE_ADDRESS_MESSAGE =
  'This is not a Company Brain link or id. Pass a page or block link copied from Company Brain, or a page or block id.';

/** Lo que se le contesta al agente cuando algo no existe o no le toca verlo: las dos cosas suenan igual. */
export const MCP_INACCESSIBLE_MESSAGE = 'Resource not accessible.';

/** Lo que se le contesta cuando su llave ya no vale: revocada, vencida o de alguien desactivado. */
export const MCP_UNAUTHENTICATED_MESSAGE =
  'The access token is missing, revoked or expired. Ask the person to create a new one in their Company Brain account settings.';

/** Una página guardada en una forma que esta versión no lee: existe, pero no se puede entregar tal cual. */
export const MCP_UNREADABLE_PAGE_MESSAGE =
  'This page is stored in a format this version of Company Brain cannot read. Ask a person to open it in the portal.';

/** Lo que se le dice cuando algo falló por dentro: el detalle queda en el registro del servidor. */
export const MCP_UNEXPECTED_MESSAGE = 'Something went wrong on the Company Brain side. Try again in a moment.';

/**
 * Lo que el agente lee al conectarse, antes de llamar a nada, salvo la línea
 * que dice dónde vive el portal, que depende de dónde corre.
 *
 * Es corto a propósito: cada palabra se paga en cada conversación. Dice qué es
 * cada cosa y por dónde empezar, y deja el cómo de cada herramienta a su propia
 * descripción, que el agente lee solo cuando la necesita. Dice también qué se
 * guarda aquí, tareas incluidas: un agente que trabaja en código piensa en su
 * propia lista de tareas si nadie le dice que las del equipo viven aquí.
 */
export const MCP_SERVER_INSTRUCTION_LINES: readonly string[] = [
  "Company Brain is the team's knowledge base: its documentation, notes, processes, projects, and its tasks and boards.",
  'When the person asks about the company, the team, its work or its tasks, look in Company Brain before saying there is nothing.',
  'When the person names a page, manual, gallery or document without a link, search for it by name here before asking them for more.',
  'Content lives in spaces; a space holds a tree of pages, and a page is made of blocks.',
  'A collection is a page whose child pages are rows with properties (a table or kanban board of tasks, for instance).',
  'To find information, start with search: it returns the exact blocks that match, with their page and section.',
  'To open something, use fetch with a Company Brain link, a page id or a block id.',
  'Pages come back as Markdown; the comment before each block carries its id. To browse, use list_spaces and list_pages.',
  'To work with a collection, read its columns and views with get_collection and find rows with query_collection. If your token can write, create_row adds a row and update_row changes one: moving a task on a board is changing its status.',
  'When the person asks to add, note or change a task of the team or of "our board", do it on a Company Brain collection, never in your own session\'s task list.',
  'A board may be named in another language than the request (a task board may be called Tasks). If searching by name finds no collection, list the spaces and the pages at their top: collections are marked as such.',
  'You act as the person who created your access token and see exactly what they can see.',
];
