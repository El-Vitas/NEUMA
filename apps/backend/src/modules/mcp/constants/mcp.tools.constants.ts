import { collectionChangesTool } from '../tools/mcp.collection-changes.tool';
import { commentOnBlockTool } from '../tools/mcp.comment-on-block.tool';
import { createCollectionTool } from '../tools/mcp.create-collection.tool';
import { createPageTool } from '../tools/mcp.create-page.tool';
import { createRowTool } from '../tools/mcp.create-row.tool';
import { createViewTool } from '../tools/mcp.create-view.tool';
import { deleteBlocksTool } from '../tools/mcp.delete-blocks.tool';
import { deleteCommentTool } from '../tools/mcp.delete-comment.tool';
import { deleteTemplateTool } from '../tools/mcp.delete-template.tool';
import { deleteViewTool } from '../tools/mcp.delete-view.tool';
import { duplicatePageTool } from '../tools/mcp.duplicate-page.tool';
import { fetchTool } from '../tools/mcp.fetch.tool';
import { getCollectionTool } from '../tools/mcp.get-collection.tool';
import { insertBlocksTool } from '../tools/mcp.insert-blocks.tool';
import { listDiscussionsTool } from '../tools/mcp.list-discussions.tool';
import { listPagesTool } from '../tools/mcp.list-pages.tool';
import { listSpacesTool } from '../tools/mcp.list-spaces.tool';
import { listTemplatesTool } from '../tools/mcp.list-templates.tool';
import { listTrashTool } from '../tools/mcp.list-trash.tool';
import { moveBlocksTool } from '../tools/mcp.move-blocks.tool';
import { movePageTool } from '../tools/mcp.move-page.tool';
import { moveRowTool } from '../tools/mcp.move-row.tool';
import { queryCollectionTool } from '../tools/mcp.query-collection.tool';
import { replyToDiscussionTool } from '../tools/mcp.reply-to-discussion.tool';
import { restorePageTool } from '../tools/mcp.restore-page.tool';
import { saveTemplateTool } from '../tools/mcp.save-template.tool';
import { searchTool } from '../tools/mcp.search.tool';
import { searchDiagramIconsTool } from '../tools/mcp.search-diagram-icons.tool';
import { trashPageTool } from '../tools/mcp.trash-page.tool';
import { updateBlockTool } from '../tools/mcp.update-block.tool';
import { updateCollectionColumnsTool } from '../tools/mcp.update-collection-columns.tool';
import { updatePageTool } from '../tools/mcp.update-page.tool';
import { updateRowTool } from '../tools/mcp.update-row.tool';
import { updateTableTool } from '../tools/mcp.update-table.tool';
import { updateViewTool } from '../tools/mcp.update-view.tool';
import { uploadFileTool } from '../tools/mcp.upload-file.tool';
import type { McpToolDefinition } from '../types/mcp.types';

/** Listed in the order they are presented to the agent. */
export const MCP_TOOLS: readonly McpToolDefinition[] = [
  searchTool,
  fetchTool,
  listSpacesTool,
  listPagesTool,
  createPageTool,
  updatePageTool,
  movePageTool,
  duplicatePageTool,
  trashPageTool,
  listTrashTool,
  restorePageTool,
  insertBlocksTool,
  updateBlockTool,
  updateTableTool,
  moveBlocksTool,
  deleteBlocksTool,
  commentOnBlockTool,
  listDiscussionsTool,
  replyToDiscussionTool,
  deleteCommentTool,
  searchDiagramIconsTool,
  getCollectionTool,
  queryCollectionTool,
  collectionChangesTool,
  createCollectionTool,
  createRowTool,
  listTemplatesTool,
  saveTemplateTool,
  deleteTemplateTool,
  updateRowTool,
  moveRowTool,
  uploadFileTool,
  updateCollectionColumnsTool,
  createViewTool,
  updateViewTool,
  deleteViewTool,
];
