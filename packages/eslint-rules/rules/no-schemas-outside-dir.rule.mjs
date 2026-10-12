export const noSchemasOutsideDir = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Zod schemas should be in a schemas/ directory' },
    messages: {
      foundSchema: 'Zod schemas belong in a `schemas/` directory. Move this schema.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/schemas/') && !filename.includes('\\schemas\\')) {
      return {
        VariableDeclarator(node) {
          if (node.init?.type !== 'CallExpression') return;
          const callee = node.init.callee;
          if (callee.type === 'MemberExpression') {
            const object = callee.object;
            if (object.type === 'Identifier' && object.name === 'z') {
              context.report({ node: node.parent, messageId: 'foundSchema' });
            }
          }
        },
      };
    }
    return {};
  },
};
