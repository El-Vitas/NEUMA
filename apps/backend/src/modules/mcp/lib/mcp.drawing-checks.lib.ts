import { MCP_DIAGRAM_BUILT_IN_ICONS, MCP_DRAWING_KINDS, MCP_REFUSAL_REASONS } from '../constants/mcp.constants';
import { MCP_DIAGRAM_ICON_PACKS } from '../constants/mcp.diagram-icons.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpDrawing } from '../types/mcp.pages.types';
import type { McpDrawingDependencies } from '../types/mcp.types';
import { hasMcpDiagramIcon } from './mcp.diagram-icons.lib';
import { findMcpArchitectureGroupingFault, listMcpDiagramIcons, listMcpDrawings } from './mcp.drawings.lib';

/** Por qué un diagrama no se dibujaría como se quiso: Mermaid no lo lee, agrupa mal o nombra un ícono que el portal no tiene. */
const checkDiagram = async (
  dependencies: McpDrawingDependencies,
  drawing: McpDrawing,
): Promise<McpToolError | null> => {
  const checked = await dependencies.drawings.checkDiagram(drawing.source);
  if (checked.isFail())
    return new McpToolError(
      `Block ${String(drawing.block)}: the diagram cannot be drawn. Mermaid says: ${checked.getError()} Fix it and write it again.`,
      MCP_REFUSAL_REASONS.diagram,
    );
  const groupingFault = findMcpArchitectureGroupingFault(drawing.source);
  if (groupingFault !== null)
    return new McpToolError(`Block ${String(drawing.block)}: ${groupingFault}`, MCP_REFUSAL_REASONS.diagramGroup);
  const unknown = listMcpDiagramIcons(drawing.source).find((icon) => !hasMcpDiagramIcon(MCP_DIAGRAM_ICON_PACKS, icon));
  return unknown === undefined
    ? null
    : new McpToolError(
        `Block ${String(drawing.block)}: the diagram names the icon ${unknown}, which Company Brain cannot draw. Without a pack only ${MCP_DIAGRAM_BUILT_IN_ICONS.join(', ')} exist; find any other with search_diagram_icons and write it as pack:name.`,
        MCP_REFUSAL_REASONS.diagramIcon,
      );
};

const checkFormula = (dependencies: McpDrawingDependencies, drawing: McpDrawing): McpToolError | null => {
  const checked = dependencies.drawings.checkFormula(drawing.source, drawing.kind === MCP_DRAWING_KINDS.formula);
  return checked.isFail()
    ? new McpToolError(
        `Block ${String(drawing.block)}: the ${drawing.kind} cannot be set. KaTeX says: ${checked.getError()}`,
        MCP_REFUSAL_REASONS.formula,
      )
    : null;
};

const checkDrawing = (dependencies: McpDrawingDependencies, drawing: McpDrawing): Promise<McpToolError | null> =>
  drawing.kind === MCP_DRAWING_KINDS.diagram
    ? checkDiagram(dependencies, drawing)
    : Promise.resolve(checkFormula(dependencies, drawing));

/**
 * Revisa, antes de escribir, que cada diagrama y cada fórmula de unos bloques
 * se pueda dibujar como lo dibujará el portal. Si uno no, no se escribe nada y
 * el agente recibe lo que dijo Mermaid o KaTeX, con el número de bloque: un
 * diagrama roto que se guarda en silencio solo lo descubre después alguien
 * que abre la página.
 */
export const checkMcpDrawings = async (
  dependencies: McpDrawingDependencies,
  nodes: readonly unknown[],
): Promise<void> => {
  const refusals = await Promise.all(listMcpDrawings(nodes).map((drawing) => checkDrawing(dependencies, drawing)));
  const refusal = refusals.find((found) => found !== null);
  if (refusal !== undefined) throw refusal;
};
