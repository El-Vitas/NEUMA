export const utilsDirOnlyUtils = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only pure utility functions are allowed in utils/ directory' },
    messages: {
      foundType: 'Types and interfaces do not belong in `utils/`. Move it to `types/`.',
      foundOther: 'Only utility functions belong in `utils/`. Move this to its proper directory.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/utils/') && !filename.includes('\\utils\\')) return {};

    return {
      TSInterfaceDeclaration(node) {
        context.report({ node, messageId: 'foundType' });
      },
      TSTypeAliasDeclaration(node) {
        context.report({ node, messageId: 'foundType' });
      },
    };
  },
};
