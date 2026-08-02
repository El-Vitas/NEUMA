// schemas-dir-only-schemas
// Qué hace: dentro de `schemas/`, solo permite declaraciones de schemas.
// Para qué: que `schemas/` no acumule runtime, componentes ni constantes (§1.1).
export const schemasDirOnlySchemas = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only Zod schemas are allowed in schemas/ directory' },
    messages: {
      foundNonSchema: 'Only Zod schemas are allowed in `schemas/`. Move this to its proper directory.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/schemas/') && !filename.includes('\\schemas\\')) return {};

    return {
      FunctionDeclaration(node) {
        context.report({ node, messageId: 'foundNonSchema' });
      },
      ClassDeclaration(node) {
        context.report({ node, messageId: 'foundNonSchema' });
      },
      TSInterfaceDeclaration(node) {
        context.report({ node, messageId: 'foundNonSchema' });
      },
      TSTypeAliasDeclaration(node) {
        context.report({ node, messageId: 'foundNonSchema' });
      },
    };
  },
};
