import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@company-brain/shared';

export const MCP_PRINCIPAL_RESOLVER = Symbol('MCP_PRINCIPAL_RESOLVER');
export const MCP_SERVER_DEPENDENCIES = Symbol('MCP_SERVER_DEPENDENCIES');

export const MCP_ROUTE = 'mcp';

/**
 * Lo que se contesta a varias llamadas mandadas juntas en un solo envío. El
 * tope de llamadas cuenta envíos: un lote de mil contaría como una.
 */
export const MCP_BATCH_REFUSED_MESSAGE = 'Send one call per request; several calls in one request are not accepted.';

/** El código con que Prisma dice que un valor único ya estaba: aquí, otro pedido con el mismo id. */
export const MCP_UNIQUE_VIOLATION_CODE = 'P2002';

/**
 * Cuánto dura, como mucho, un pedido en curso. Uno que lleva más que esto
 * pendiente es de un proceso que se cayó o de un cierre que no se anotó: no se
 * sabe si se hizo, y su id no se libera, porque hacerlo de nuevo podría
 * duplicarlo.
 */
export const MCP_ABANDONED_REQUEST_MS = 10 * 60 * 1000;

/** El origen con que se arma la petición web que recibe el manejador del MCP, que solo lee su ruta. */
export const MCP_WEB_REQUEST_ORIGIN = 'http://mcp.local';

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
  commentOnBlock: 'comment_on_block',
  createCollection: 'create_collection',
  createPage: 'create_page',
  createRow: 'create_row',
  createView: 'create_view',
  deleteBlocks: 'delete_blocks',
  deleteComment: 'delete_comment',
  duplicatePage: 'duplicate_page',
  deleteView: 'delete_view',
  fetch: 'fetch',
  getCollection: 'get_collection',
  insertBlocks: 'insert_blocks',
  listPages: 'list_pages',
  listSpaces: 'list_spaces',
  listTrash: 'list_trash',
  moveBlocks: 'move_blocks',
  movePage: 'move_page',
  queryCollection: 'query_collection',
  restorePage: 'restore_page',
  search: 'search',
  searchDiagramIcons: 'search_diagram_icons',
  trashPage: 'trash_page',
  updateBlock: 'update_block',
  updateCollectionColumns: 'update_collection_columns',
  updatePage: 'update_page',
  updateRow: 'update_row',
  updateTable: 'update_table',
  updateView: 'update_view',
} as const;

/** Un salto de línea dentro de un párrafo de una página. */
export const MCP_HARD_BREAK_NODE = { type: 'hard_break' } as const;

/** El párrafo vacío con que nace una página sin texto, igual que en el portal. */
export const MCP_EMPTY_PARAGRAPH_NODE = { content: [], type: 'paragraph' } as const;

/** Una página que todavía no dice nada: la que crea el agente sin bloques. */
export const MCP_EMPTY_PAGE_CONTENT: PageContent = {
  content: [MCP_EMPTY_PARAGRAPH_NODE],
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
};

/**
 * Lo que las herramientas que escriben bloques cuentan de los diagramas. Va en
 * su descripción porque es lo que un agente lee antes de escribir: la del
 * bloque queda anidada en el esquema y no siempre la abre.
 */
export const MCP_DIAGRAM_LOGOS_NOTE =
  'A diagram block can draw real product logos and icons (Postgres, AWS, a server): find them with search_diagram_icons.';

/** Las direcciones que una tarjeta de enlace puede llevar: páginas web, nada que se ejecute ni que abra otra cosa. */
export const MCP_BOOKMARK_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/** El lugar que ocupa en una línea lo que no es texto —una mención, una fórmula— al buscar unas palabras en ella. */
export const MCP_INLINE_OBJECT_PLACEHOLDER = '￼';

/** Los colores con que se puede pintar un bloque entero, con el nombre que tienen en la página. */
export const MCP_BLOCK_COLOR_NAMES = ['backgroundColor', 'textColor'] as const;

/** Lo que un bloque lleva encima y pasa al bloque que lo reemplaza: lo que otras personas dijeron, y cómo está pintado. */
export const MCP_BLOCK_KEPT_ATTRIBUTES = ['comments', ...MCP_BLOCK_COLOR_NAMES] as const;

/** Lo que dice el worker que revisa diagramas cuando ya cargó Mermaid y puede empezar. */
export const MCP_DIAGRAM_WORKER_READY = 'ready';

/** El archivo del worker que revisa diagramas, junto al adaptador que lo levanta; el backend corre desde el código fuente. */
export const MCP_DIAGRAM_WORKER_FILE = './mcp.diagram.worker.ts';

/** Qué se dibuja en una página a partir de lo escrito, y por eso hay que revisar antes de guardarlo. */
export const MCP_DRAWING_KINDS = {
  diagram: 'diagram',
  formula: 'formula',
  inlineFormula: 'inline formula',
} as const;

/**
 * Dónde nombra un diagrama un ícono de un paquete: entre paréntesis en un
 * diagrama de arquitectura, `service db(logos:postgresql)`, o como `icon:` en
 * un nodo de un flowchart, `A@{ icon: "mdi:server" }`.
 */
export const MCP_DIAGRAM_ICON_PATTERNS: readonly RegExp[] = [
  /\(([a-z0-9-]+:[a-z0-9-]+)\)/g,
  /icon:[ \t]*["']([a-z0-9-]+:[a-z0-9-]+)["']/g,
  /^[ \t]*(?:group|service)[ \t]+[\w-]+\(([\w-]+)\)/gm,
];

/**
 * La línea con que empieza un diagrama de arquitectura, después de su
 * configuración si la tiene. La sangría es solo de espacios y tabulaciones:
 * con saltos de línea dentro, un texto de miles de líneas vacías tardaría
 * el cuadrado de su largo en revisarse.
 */
export const MCP_ARCHITECTURE_DIAGRAM_START = /^[ \t]*architecture-beta\b/m;

/** Una línea que pone algo en un diagrama de arquitectura: su sangría, qué es y su nombre. */
export const MCP_ARCHITECTURE_MEMBER_LINE = /^([ \t]*)(group|service|junction)[ \t]+([\w-]+)/;

/** Lo que separa las palabras de una línea de un diagrama: espacios y tabulaciones. */
export const MCP_ARCHITECTURE_WORD_SEPARATOR = /[ \t]+/;

/** La palabra con que una línea de un diagrama de arquitectura dice en qué grupo va: `… in <grupo>`. */
export const MCP_ARCHITECTURE_IN_WORD = 'in';

/** El nombre de un grupo de un diagrama de arquitectura. */
export const MCP_ARCHITECTURE_NAME = /^[\w-]+$/;

/** Lo que agrupa en un diagrama de arquitectura. */
export const MCP_ARCHITECTURE_GROUP = 'group';

/** Los íconos que Mermaid dibuja sin paquete en un diagrama de arquitectura; cualquier otro nombre sale como un signo de pregunta. */
export const MCP_DIAGRAM_BUILT_IN_ICONS: readonly string[] = ['cloud', 'database', 'disk', 'internet', 'server'];

/** Lo que separa las palabras de un ícono buscado: espacios, guiones y guiones bajos. */
export const MCP_ICON_NAME_SEPARATORS = /[\s\-_]+/;

/** Lo que separa dos párrafos en el texto que el agente escribe: una línea en blanco. */
export const MCP_PARAGRAPH_SEPARATOR = /\n\s*\n/;

/** Un salto de línea dentro de un párrafo. */
export const MCP_LINE_SEPARATOR = /\r?\n/;

/** Hasta qué nivel escribe su log el MCP por terminal: las llamadas y sus fallos. */
export const MCP_STDIO_LOG_LEVEL = 'info';

/** Cómo puede terminar una llamada a una herramienta. */
export const MCP_CALL_OUTCOMES = { done: 'DONE', failed: 'FAILED', refused: 'REFUSED' } as const;

/**
 * Por qué se rechazó una llamada, cuando el rechazo lo sabe, para contarlos y
 * buscarlos en el log. El mensaje al agente no va al log porque puede citar lo
 * que escribió.
 */
export const MCP_REFUSAL_REASONS = {
  diagram: 'diagram',
  diagramGroup: 'diagram group',
  diagramIcon: 'diagram icon',
  formula: 'formula',
} as const;

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

/** Lo que se le dice cuando escribe una mención a una página que no existe o no puede ver: las dos suenan igual. */
export const MCP_UNREACHABLE_REFERENCE_MESSAGE =
  'A mention or a block points at a page that does not exist or is not accessible. Point only at pages you can open with fetch.';

/** Lo que se le dice cuando pide crear una página sin decir dónde, o en dos lugares a la vez. */
export const MCP_CREATE_PAGE_PLACE_MESSAGE =
  'Say where the page goes: a parent page (a link or id), or a space id for the top of that space. Only one of the two.';

/** Lo que se le dice cuando pide cambiar algo sin decir qué. */
export const MCP_NOTHING_TO_CHANGE_MESSAGE = 'Nothing to change: say what should change.';

/** Los rechazos que se contestan como un recurso que no está: decir más confirmaría que existe. */
export const MCP_INACCESSIBLE_REFUSAL_CODES: readonly string[] = ['PAGE_ACCESS_DENIED', 'PAGE_SCHEMA_NOT_FOUND'];

export const MCP_LOCKED_REFUSAL_CODE = 'PAGE_LOCKED';

/** Cómo se marca, en lo que encuentra `search`, lo que viene de una página verificada y vigente. */
export const MCP_VERIFIED_HIT_MARK = ', verified page';

/** Lo que se le dice al agente que pidió bloquear, verificar o dar dueño sin el permiso para eso. */
export const MCP_PAGE_MANAGE_REFUSED_MESSAGE =
  'This token may write this page but not lock it, vouch for it or give it an owner: that needs the permission to manage pages, which only the owner of the token can give it. Nothing was changed.';

/** Lo que acepta una página como ícono: un emoji, uno solo. */
export const MCP_PAGE_ICON_INVALID_MESSAGE = 'The icon must be one emoji.';

/** Lo que se le dice al agente cuando el portal rechaza cambiar una página entera, por qué y qué hacer en su lugar. */
export const MCP_REFUSAL_EXPLANATIONS: ReadonlyMap<string, string> = new Map([
  ['PAGE_CYCLE', 'A page cannot go under itself or under a page that hangs from it.'],
  ['PAGE_ICON_INVALID', MCP_PAGE_ICON_INVALID_MESSAGE],
  [
    'PAGE_INVALID_LIFECYCLE',
    'The page is not where that can happen: only a page out of the trash can be sent to it, and only a page in the trash can be restored.',
  ],
  ['PAGE_OWNER_INVALID', 'The owner must be a member of the workspace.'],
  [
    'PAGE_PARENT_INVALID',
    'The page it would go under does not exist or is in another space: name a page of the destination space, or only the space.',
  ],
]);

/** Lo que otra persona movió entre que el agente leyó y escribió: una vista que ya no está, una opción ya renombrada. */
/**
 * Los rechazos que hablan de lo que el agente escribió, cuyo detalle le sirve
 * para corregirlo. El detalle de cualquier otro no se le pasa.
 */
export const MCP_DETAILED_REFUSAL_CODES: readonly string[] = [
  'PAGE_BLOCK_EDIT_INVALID',
  'PAGE_CONTENT_INVALID',
  'PAGE_COVER_INVALID',
  'PAGE_PROPERTY_CONFORMANCE',
  'PAGE_PROPERTY_INVALID',
  'PAGE_SCHEMA_DEFINITION_INVALID',
  'SCHEMA_PROPERTY_DEFINITION_INVALID',
  'SCHEMA_PROPERTY_VALUE_INVALID',
  'SCHEMA_VIEW_INVALID',
];

/** Lo que se contesta a un reintento de un pedido que ya se hizo: no se hace de nuevo. */
export const MCP_REQUEST_ALREADY_DONE_MESSAGE = 'This request id was already carried out, so nothing was done again.';

/** Lo que se contesta a un reintento que llega mientras el pedido original todavía corre. */
export const MCP_REQUEST_IN_PROGRESS_MESSAGE =
  'A call with this request id is still under way. Wait a moment and read the page to see whether it was done, instead of sending it again.';

/** Lo que se contesta a un id que este token ya usó para otro pedido: no es un reintento. */
export const MCP_REQUEST_ID_TAKEN_MESSAGE =
  'This request id was already used for another call, so nothing was done. Use a new request id for each different call.';

/** Lo que se contesta a un reintento de un pedido que quedó a medio anotar: puede haberse hecho. */
export const MCP_REQUEST_UNKNOWN_MESSAGE =
  'A call with this request id started long ago and it is not known whether it was done. Read the page to check; if what you asked for is not there, send it again with a new request id.';

/** Lo que se contesta al pedir un cambio sobre una página que está en la papelera. */
export const MCP_PAGE_IN_TRASH_MESSAGE =
  'This page is in the trash, so it cannot be changed. Bring it back with restore_page first, or ask a person.';

/** Lo que se dice primero al abrir una página que está en la papelera. */
export const MCP_FETCHED_IN_TRASH_NOTE =
  'This page is in the trash: what it says no longer counts for the team. restore_page brings it back.';

/** Lo que se contesta al pedir traer de vuelta una página que no está en la papelera. */
export const MCP_PAGE_NOT_IN_TRASH_MESSAGE = 'This page is not in the trash, so there is nothing to bring back.';

export const MCP_CONCURRENT_REFUSAL_CODES: readonly string[] = [
  'PAGE_SCHEMA_CHANGED',
  'PAGE_VIEW_NOT_FOUND',
  'SCHEMA_PROPERTY_DEFINITION_INVALID',
];

/** Cómo empieza lo que se le dice cuando Company Brain rechazó el cambio por lo que pedía. */
export const MCP_REFUSED_CHANGE_PREFIX = 'Company Brain refused the change:';

/** Lo que aparece en lugar de una página que el agente no puede ver: nombrarla ya diría demasiado. */
export const MCP_REDACTED_REFERENCE_LABEL = '[unavailable page]';

/** Por qué no se tocó un árbol de páginas cuando lo protege una página de abajo que el token no puede leer. */
export const MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE =
  'This token cannot do that to the whole tree under this page, so nothing was done. Ask the owner of the token or of the page.';

/** Lo que contesta un cambio a un token que configura la colección pero no la lee. */
export const MCP_CONFIGURED_UNREADABLE_NOTE =
  'Saved. This token may change this collection but not read it, so its columns and views are not shown:';

/** Lo que contesta una escritura a un token que escribe en la página pero no la lee. */
export const MCP_WRITTEN_UNREADABLE_NOTE =
  'Written. This token may write this page but not read it, so what the page says is not shown:';

/** Lo que apunta a otra página dentro de una línea. */
export const MCP_INLINE_REFERENCE_TYPES: readonly string[] = ['mention'];

/** Lo que muestra el nombre de la página a la que apunta, guardado cuando se escribió. */
export const MCP_LABELED_REFERENCE_TYPES: readonly string[] = ['mention', 'subpage'];

/** Bloques que muestran otra página, o actúan sobre ella: su título, un bloque suyo, sus filas, o un botón que le agrega filas. */
export const MCP_BLOCK_REFERENCE_TYPES: readonly string[] = ['button', 'collection', 'subpage', 'synced'];

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
  'If your token can write pages, read the page with fetch first to get its block ids, then write with insert_blocks, update_block, move_blocks or delete_blocks; create_page makes a new page. Write each block by what it means: a table as a table, code or a diagram drawn with spaces as a code_block.',
  'Diagrams are Mermaid, any kind, and can show product logos and icons (never emojis in their place): find their names with search_diagram_icons before drawing.',
  'Besides text, a page holds columns side by side, link cards, videos from YouTube, Vimeo, Loom or Figma, and blocks synced from another page: write them as blocks too.',
  'A remark or a question about a block is a comment (comment_on_block), not text written into the page. Words can be underlined, coloured or highlighted, and a whole block painted with update_block; a table is changed cell by cell with update_table. update_page, move_page, duplicate_page, trash_page and restore_page change a page as a whole; list_trash shows what is in the trash, which search does not find. fetch says whether a page is verified, locked and who owns it.',
  'To work with a collection, read its columns and views with get_collection and find rows with query_collection. If your token can write, create_row adds a row and update_row changes one: moving a task on a board is changing its status.',
  'When the person asks to add, note or change a task of the team or of "our board", do it on a Company Brain collection, never in your own session\'s task list.',
  'A board may be named in another language than the request (a task board may be called Tasks). If searching by name finds no collection, list the spaces and the pages at their top: collections are marked as such.',
  'You act as the person who created your access token, limited to what the token allows: anything out of its reach answers as not accessible, the same as something that does not exist.',
];
