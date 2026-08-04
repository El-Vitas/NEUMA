// dir-only-exports util
// Qué hace: recorre los declaradores de una exportación `export const a = ..., b = ...`.
// Para qué: las reglas `*-dir-only-*` reutilizan el mismo recorrido para validar cada nombre exportado.
export function* eachExportedVariableDeclarator(node) {
  const declaration = node.declaration;
  if (!declaration || declaration.type !== 'VariableDeclaration') return;

  for (const declarator of declaration.declarations) {
    if (declarator.id.type === 'Identifier') yield declarator;
  }
}
