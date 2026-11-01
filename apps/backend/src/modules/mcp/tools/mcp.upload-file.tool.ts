import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { canMcpAct, openMcpPage, readMcpPageId, requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { readMcpPlace } from '../lib/mcp.tool.lib';
import { decodeMcpUpload } from '../lib/mcp.uploads.lib';
import { uploadFileInputSchema, uploadFileOutputSchema } from '../schemas/mcp.files.schemas';
import type { McpUploadFileInput, McpUploadFileOutput } from '../types/mcp.files.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

/** A row is a page, so a token that writes collections may attach a file to one as a token that writes pages may. */
const uploadFile = async (
  dependencies: McpServerDependencies,
  input: McpUploadFileInput,
  { call, record }: McpWriteSession,
): Promise<McpUploadFileOutput> => {
  const pageId = readMcpPageId(input.page);
  const place = await readMcpPlace(dependencies, pageId, call.workspace.id);
  const permission = canMcpAct(call, place, ACCESS_TOKEN_PERMISSIONS.pagesWrite)
    ? ACCESS_TOKEN_PERMISSIONS.pagesWrite
    : ACCESS_TOKEN_PERMISSIONS.collectionsWrite;
  const { page } = await openMcpPage(dependencies, call, pageId, permission);
  const buffer = requireMcpInput(decodeMcpUpload(input.contentBase64));
  const request = {
    blockIds: [],
    detail: { contentType: input.contentType, size: buffer.length },
    pageId: page.id,
    tool: MCP_TOOL_NAMES.uploadFile,
  };
  const { principal, workspace } = call;
  const stored = await record(request, async () =>
    requireMcpSuccess(
      await dependencies.files.upload({
        buffer,
        mimeType: input.contentType,
        originalFilename: input.name,
        ownerId: principal.userId,
        pageId: page.id,
        role: principal.role,
        size: buffer.length,
        workspaceId: workspace.id,
      }),
    ),
  );
  return {
    contentType: stored.mimeType,
    id: stored.id,
    name: stored.originalFilename,
    page: page.id,
    size: stored.size,
  };
};

const formatUploadedFileText = (output: McpUploadFileOutput): string =>
  `File stored: ${output.name} (${output.contentType}, ${String(output.size)} bytes).\nFile id: ${output.id}\nPut this id in a files column of a row, with create_row or update_row, to attach it.`;

/** The same checks as the portal's upload: size, type, name, and who may add files to the page. */
export const uploadFileTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.uploadFile,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.uploadFile,
      {
        description:
          'Store a file, sent as base64 with its name and MIME type, on a page or a row, the way a person uploads it in the portal: up to 10 MB, only the types the portal accepts, and only on a page the token can write. Returns the file id; to attach the file to a row, put that id in a files column with create_row or update_row. Files stay on the page they were uploaded to.',
        inputSchema: uploadFileInputSchema,
        outputSchema: uploadFileOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.uploadFile },
          (session) => uploadFile(dependencies, input, session),
          formatUploadedFileText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite, ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
