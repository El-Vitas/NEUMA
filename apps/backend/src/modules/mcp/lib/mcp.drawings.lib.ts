import {
  isPageDocumentNode,
  listPageDocumentChildren,
  PAGE_DIAGRAM_LANGUAGE,
  PAGE_FORMULA_LANGUAGE,
  readPageDocumentText,
} from '@company-brain/shared';
import {
  MCP_ARCHITECTURE_DIAGRAM_START,
  MCP_ARCHITECTURE_GROUP,
  MCP_ARCHITECTURE_MEMBER_LINE,
  MCP_DIAGRAM_ICON_PATTERNS,
  MCP_DRAWING_KINDS,
} from '../constants/mcp.constants';
import type { McpArchitectureMember, McpDrawing } from '../types/mcp.pages.types';

const readCode = (node: unknown): string =>
  isPageDocumentNode(node)
    ? listPageDocumentChildren(node)
        .map((child) => child.text ?? '')
        .join('')
    : '';

const readCodeBlockDrawing = (node: unknown, block: number): McpDrawing[] => {
  if (!isPageDocumentNode(node)) return [];
  const language = readPageDocumentText(node, 'language');
  if (language === PAGE_DIAGRAM_LANGUAGE) return [{ block, kind: MCP_DRAWING_KINDS.diagram, source: readCode(node) }];
  if (language === PAGE_FORMULA_LANGUAGE) return [{ block, kind: MCP_DRAWING_KINDS.formula, source: readCode(node) }];
  return [];
};

const findDrawings = (node: unknown, block: number): McpDrawing[] => {
  if (!isPageDocumentNode(node)) return [];
  if (node.type === 'code_block') return readCodeBlockDrawing(node, block);
  if (node.type === 'formula')
    return [{ block, kind: MCP_DRAWING_KINDS.inlineFormula, source: readPageDocumentText(node, 'latex') ?? '' }];
  return (node.content ?? []).flatMap((child) => findDrawings(child, block));
};

/**
 * Todo lo que unos bloques le piden a la página dibujar —diagramas, fórmulas
 * en su línea y dentro de una frase—, con el bloque de arriba en que está,
 * contando desde uno, para decir cuál falló.
 */
export const listMcpDrawings = (nodes: readonly unknown[]): McpDrawing[] =>
  nodes.flatMap((node, index) => findDrawings(node, index + 1));

/** Los íconos que nombra un diagrama, como `paquete:ícono` o como uno propio de Mermaid, una vez cada uno. */
export const listMcpDiagramIcons = (source: string): string[] => [
  ...new Set(
    MCP_DIAGRAM_ICON_PATTERNS.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1] ?? '')),
  ),
];

const readArchitectureMember = (line: string): McpArchitectureMember[] => {
  const match = MCP_ARCHITECTURE_MEMBER_LINE.exec(line);
  if (match === null) return [];
  const [, indent = '', kind, name = '', parent] = match;
  return [{ indent: indent.length, isGroup: kind === MCP_ARCHITECTURE_GROUP, name, parent: parent ?? null }];
};

/** El grupo escrito más cerca por encima de un miembro, que es donde lo pone la sangría. */
const findGroupAbove = (members: readonly McpArchitectureMember[], index: number): McpArchitectureMember | undefined =>
  members.slice(0, index).findLast((member) => member.isGroup);

const isIndentedOutOfItsGroup = (
  member: McpArchitectureMember,
  groupAbove: McpArchitectureMember | undefined,
): groupAbove is McpArchitectureMember =>
  !member.isGroup && member.parent === null && groupAbove !== undefined && member.indent > groupAbove.indent;

const findIndentedStray = (members: readonly McpArchitectureMember[]): string | null => {
  for (const [index, member] of members.entries()) {
    const groupAbove = findGroupAbove(members, index);
    if (isIndentedOutOfItsGroup(member, groupAbove))
      return `the service ${member.name} is indented under the group ${groupAbove.name} but is not in it: indentation groups nothing in architecture-beta. End its line with "in ${groupAbove.name}".`;
  }
  return null;
};

const findEmptyGroup = (members: readonly McpArchitectureMember[]): string | null => {
  const holders = new Set(members.map((member) => member.parent));
  const empty = members.find((member) => member.isGroup && !holders.has(member.name));
  return empty === undefined
    ? null
    : `the group ${empty.name} has nothing in it. End the line of each service that belongs there with "in ${empty.name}", or remove the group.`;
};

/**
 * Lo que un diagrama de arquitectura agrupa mal aunque Mermaid lo lea: un
 * servicio con sangría bajo un grupo pero fuera de él, o un grupo vacío. Se
 * dibujan igual, con las cajas vacías a un lado y los servicios sueltos, y
 * casi siempre es porque se escribió la sangría creyendo que agrupa.
 */
export const findMcpArchitectureGroupingFault = (source: string): string | null => {
  if (!MCP_ARCHITECTURE_DIAGRAM_START.test(source)) return null;
  const members = source.split('\n').flatMap(readArchitectureMember);
  return findIndentedStray(members) ?? findEmptyGroup(members);
};
