import { ACCESS_TOKEN_PERMISSIONS, canAccessTokenAct } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { MCP_TRASH_LISTED_MAX } from '../constants/mcp.limits.constants';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { listTrashInputSchema, listTrashOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpListTrashOutput, McpTrashedPage } from '../types/mcp.page-management.types';
import type { McpCall, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/**
 * De lo que hay en la papelera, lo que el token puede leer donde estaba cada
 * página: una regla de página que la cierra la deja fuera, como en `search`.
 * Se revisa página por página, a la vez; la papelera es corta, y esto cuesta
 * una consulta por página.
 */
const keepReadable = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  trashed: readonly McpTrashedPage[],
): Promise<McpTrashedPage[]> => {
  const places = await Promise.all(
    trashed.map((page) => dependencies.placeReader.readPlace(page.id, call.workspace.id)),
  );
  const { access, role } = call.principal;
  return trashed.filter((_page, index) => {
    const place = places[index];
    return (
      place !== null &&
      place !== undefined &&
      canAccessTokenAct(access, role, place, ACCESS_TOKEN_PERMISSIONS.pagesRead)
    );
  });
};

const describeTrashedPage = (portalUrl: string, page: McpTrashedPage): McpListTrashOutput['pages'][number] => ({
  deletedAt: page.deletedAt.toISOString(),
  deletedBy: page.deletedBy,
  id: page.id,
  spaceId: page.spaceId,
  title: page.title,
  trashedChildCount: page.trashedChildCount,
  url: buildMcpPageUrl(portalUrl, page.spaceId, page.id, null),
});

/** Cada página en una línea: cuándo y quién la borró, y cuántas se fueron con ella. */
const formatTrashText = (output: McpListTrashOutput): string => {
  if (output.pages.length === 0) return 'Nothing in the trash that this token can read.';
  const lines = output.pages.map((page) => {
    const by = page.deletedBy === null ? '' : ` by ${page.deletedBy.name}`;
    const along = page.trashedChildCount === 0 ? '' : `, ${String(page.trashedChildCount)} pages under it went along`;
    return `- ${page.title} (page ${page.id}, trashed ${page.deletedAt.slice(0, 10)}${by}${along})`;
  });
  const more =
    output.total > output.pages.length
      ? `\n${String(output.total - output.pages.length)} more: narrow it with search.`
      : '';
  return `In the trash:\n${lines.join('\n')}${more}`;
};

/** Lo que hay en la papelera, para traer una página de vuelta con `restore_page` sin saber su id. */
export const listTrashTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.listTrash,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.listTrash,
      {
        description:
          'List the pages in the trash, the latest first, with who trashed them and how many pages went along. Search does not find trashed pages: look here, then bring one back with restore_page.',
        inputSchema: listTrashInputSchema,
        outputSchema: listTrashOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.listTrash,
          async () => {
            const call = await openMcpCall(dependencies);
            const { role, userId } = call.principal;
            const trashed = await dependencies.pages.listTrashed(
              call.workspace.id,
              userId,
              role,
              input.space ?? null,
              input.search ?? null,
            );
            const readable = await keepReadable(dependencies, call, trashed);
            return {
              pages: readable
                .toSorted((first, second) => second.deletedAt.getTime() - first.deletedAt.getTime())
                .slice(0, MCP_TRASH_LISTED_MAX)
                .map((page) => describeTrashedPage(dependencies.portalUrl, page)),
              total: readable.length,
            };
          },
          formatTrashText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
