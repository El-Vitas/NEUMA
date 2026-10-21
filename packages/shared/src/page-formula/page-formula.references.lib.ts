import type { PageFormulaNode } from './page-formula.types.js';

const collect = (node: PageFormulaNode, keys: Set<string>): void => {
  switch (node.kind) {
    case 'PROPERTY':
      keys.add(node.propertyKey);
      return;
    case 'CALL':
      for (const argument of node.arguments) collect(argument, keys);
      return;
    case 'BINARY':
      collect(node.left, keys);
      collect(node.right, keys);
      return;
    case 'UNARY':
      collect(node.operand, keys);
      return;
    case 'LITERAL':
      return;
  }
};

/** The keys of the properties a formula reads, without checking types. */
export const listPageFormulaReferences = (ast: PageFormulaNode): readonly string[] => {
  const keys = new Set<string>();
  collect(ast, keys);
  return [...keys];
};
