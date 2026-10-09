export function* eachExportedVariableDeclarator(node) {
  const declaration = node.declaration;
  if (!declaration || declaration.type !== 'VariableDeclaration') return;

  for (const declarator of declaration.declarations) {
    if (declarator.id.type === 'Identifier') yield declarator;
  }
}
