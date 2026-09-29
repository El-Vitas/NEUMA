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
  fetch: 'fetch',
  listPages: 'list_pages',
  listSpaces: 'list_spaces',
  search: 'search',
} as const;

/** Lo que aparece en lugar de una página que el agente no puede ver: nombrarla ya diría demasiado. */
export const MCP_REDACTED_REFERENCE_LABEL = '[unavailable page]';

/** Lo que apunta a otra página dentro de una línea. */
export const MCP_INLINE_REFERENCE_TYPES: readonly string[] = ['mention'];

/** Bloques que muestran otra página: su título, un bloque suyo o sus filas. */
export const MCP_BLOCK_REFERENCE_TYPES: readonly string[] = ['collection', 'subpage', 'synced'];

/** Lo que se le dice cuando pidió un bloque que ya no está, y se le entrega la página donde estaba. */
export const MCP_BLOCK_NOT_FOUND_NOTE =
  'The block you asked for is no longer on this page. This is the page it was on, as it is now.';

/** La palabra que queda en lugar de una mención a una página que el agente no puede ver. */
export const MCP_REDACTED_REFERENCE_WORD = { text: MCP_REDACTED_REFERENCE_LABEL, type: 'text' } as const;

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
 * Lo que el agente lee al conectarse, antes de llamar a nada.
 *
 * Es corto a propósito: cada palabra se paga en cada conversación. Dice qué es
 * cada cosa y por dónde empezar, y deja el cómo de cada herramienta a su propia
 * descripción, que el agente lee solo cuando la necesita.
 */
export const MCP_SERVER_INSTRUCTIONS = [
  'Company Brain is a team knowledge base. Content lives in spaces; a space holds a tree of pages, and a page is made of blocks.',
  'A collection is a page whose child pages are rows with properties (a table or kanban board).',
  'To find information, start with search: it returns the exact blocks that match, with their page and section.',
  'To open something, use fetch with a Company Brain link, a page id or a block id. When the person gives you a link, fetch it.',
  'Pages come back as Markdown; the comment before each block carries its id. To browse, use list_spaces and list_pages.',
  'You act as the person who created your access token and see exactly what they can see.',
].join('\n');
