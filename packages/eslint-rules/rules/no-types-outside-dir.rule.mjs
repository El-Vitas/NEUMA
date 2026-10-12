export const noTypesOutsideDir = {
  meta: {
    type: 'suggestion',
    docs: { description: 'types belong in a types/ dir (or a *.types.ts file inside domain/)' },
    messages: {
      foundInterface:
        'Types and interfaces belong in a `types/` directory (or a `*.types.ts` file inside `domain/`). Move this interface.',
      foundTypeAlias:
        'Types and interfaces belong in a `types/` directory (or a `*.types.ts` file inside `domain/`). Move this type alias.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const inDomain = filename.includes('/domain/') || filename.includes('\\domain\\');
    const isTypesFile = filename.endsWith('.types.ts') || filename.endsWith('.types.tsx');
    const isInAllowedDir =
      filename.includes('/types/') ||
      filename.includes('\\types\\') ||
      filename.includes('/dto/') ||
      filename.includes('\\dto\\') ||
      (inDomain && isTypesFile);
    if (isInAllowedDir) return {};

    return {
      TSInterfaceDeclaration(node) {
        if (node.id.name.endsWith('Props')) return;
        context.report({ node, messageId: 'foundInterface' });
      },
      TSTypeAliasDeclaration(node) {
        if (node.id.name.endsWith('Props') || node.id.name.endsWith('ErrorCode')) return;
        context.report({ node, messageId: 'foundTypeAlias' });
      },
    };
  },
};
