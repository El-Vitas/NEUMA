export const noAwaitImport = {
  meta: {
    type: 'suggestion',
    docs: { description: 'avoid await import() in favor of static imports' },
    messages: {
      foundAwaitImport: 'Usa imports estáticos en el tope del archivo en vez de `await import()`.',
    },
    schema: [],
  },
  create(context) {
    return {
      AwaitExpression: (node) => {
        if (node.argument.type === 'ImportExpression') {
          context.report({ node, messageId: 'foundAwaitImport' });
        }
      },
    };
  },
};
