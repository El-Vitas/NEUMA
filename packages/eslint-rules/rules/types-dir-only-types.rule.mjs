// types-dir-only-types
// Qué hace: dentro de `types/`, solo permite tipos/interfaces.
// Para qué: que `types/` no acumule runtime, schemas ni constantes (§1.1).
export const typesDirOnlyTypes = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only types and interfaces are allowed in types/ directory' },
    messages: {
      foundConst: 'Only types and interfaces are allowed in types/ directory. Move this constant to constants/.',
      foundFunction: 'Only types and interfaces are allowed in types/ directory. Move this function.',
      foundClass: 'Only types and interfaces are allowed in types/ directory. Move this class.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const isInTypesDir = filename.includes('/types/') || filename.includes('\\types\\');

    if (!isInTypesDir) return {};

    return {
      VariableDeclaration(node) {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            context.report({ node, messageId: 'foundConst' });
          }
        }
      },
      FunctionDeclaration(node) {
        context.report({ node, messageId: 'foundFunction' });
      },
      ClassDeclaration(node) {
        context.report({ node, messageId: 'foundClass' });
      },
    };
  },
};
