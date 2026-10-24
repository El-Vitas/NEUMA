import type { PageFormulaDefinition, PageFormulaNode } from './page-formula.types.js';

const collectReferences = (node: PageFormulaNode, renames: ReadonlyMap<string, string>): readonly PageFormulaNode[] => {
  switch (node.kind) {
    case 'PROPERTY':
      return renames.has(node.propertyKey) ? [node] : [];
    case 'CALL':
      return node.arguments.flatMap((argument) => collectReferences(argument, renames));
    case 'BINARY':
      return [...collectReferences(node.left, renames), ...collectReferences(node.right, renames)];
    case 'UNARY':
      return collectReferences(node.operand, renames);
    case 'LITERAL':
      return [];
  }
};

/**
 * The source of a formula after properties it reads change their names (`renames` maps a key to its new label): only
 * the quoted names are rewritten, so the spacing and everything else stay as the person wrote them. The result is
 * parsed again to refresh the positions.
 */
export const renamePageFormulaProperties = (
  definition: PageFormulaDefinition,
  renames: ReadonlyMap<string, string>,
): string => {
  const references = [...collectReferences(definition.ast, renames)].sort((left, right) => right.from - left.from);
  return references.reduce((source, reference) => {
    if (reference.kind !== 'PROPERTY') return source;
    const label = renames.get(reference.propertyKey);
    return label === undefined
      ? source
      : `${source.slice(0, reference.labelFrom)}${JSON.stringify(label)}${source.slice(reference.labelTo)}`;
  }, definition.source);
};

export const renamePageFormulaProperty = (
  definition: PageFormulaDefinition,
  propertyKey: string,
  newLabel: string,
): string => renamePageFormulaProperties(definition, new Map([[propertyKey, newLabel]]));
