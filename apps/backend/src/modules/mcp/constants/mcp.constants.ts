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
  listSpaces: 'list_spaces',
  readPage: 'read_page',
  searchCompanyBrain: 'search_company_brain',
} as const;

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
  'Company Brain is a team knowledge base. Content lives in spaces; a space holds a tree of pages.',
  'A page is a document. A collection is a page whose child pages are rows with properties (a table or kanban board).',
  'To find information, start with search_company_brain. To see what exists, use list_spaces.',
  'Every result carries ids; pass them to the next tool instead of searching again.',
  'You act as the person who created your access token and see exactly what they can see.',
].join('\n');
