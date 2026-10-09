export const noFunctionKeyword = {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow function keyword in favor of arrow functions' },
    messages: {
      foundFunction: 'Use arrow functions or const/let instead of the function keyword.',
    },
    schema: [],
  },
  create(context) {
    return {
      FunctionDeclaration: (node) => {
        context.report({ node, messageId: 'foundFunction' });
      },
      VariableDeclaration: (node) => {
        for (const decl of node.declarations) {
          if (decl.init?.type === 'FunctionExpression') {
            context.report({ node: decl.init, messageId: 'foundFunction' });
          }
        }
      },
    };
  },
};
