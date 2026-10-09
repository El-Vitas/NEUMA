import { icons as brandIcons } from '@iconify-json/logos';
import { icons as materialIcons } from '@iconify-json/mdi';
import type { McpIconPack } from '../types/mcp.pages.types';

/** Same packs the portal registers with Mermaid; an icon outside them is not drawn. */
export const MCP_DIAGRAM_ICON_PACKS: readonly McpIconPack[] = [brandIcons, materialIcons];

export const MCP_DIAGRAM_ICON_USAGE = [
  'Use an icon as pack:name inside a diagram block (Mermaid). The only accepted forms:',
  '- architecture-beta, a group: group web(cloud)[Web] puts the icon in parentheses and the label in brackets',
  '- without a pack, the only icons are cloud, database, disk, internet and server',
  '- architecture-beta, a service in it: service db(logos:postgresql)["Base de datos (principal)"] in web',
  '- architecture-beta has no end and no nesting by indentation: every line stands alone, and "in web" is what puts a service in a group',
  '- architecture-beta, an edge between two sides: db:L -- R:web',
  '- architecture-beta labels take only letters, digits, spaces and _ unless quoted: ["Portal Next.js"]',
  '- flowchart, a node: A@{ icon: "mdi:server", form: "square", label: "API" }',
].join('\n');
