// no-multi-component
// Qué hace: prohíbe más de un componente público por archivo.
// Para qué: un componente por archivo (§1.1); facilita ubicar y reusar piezas.
const STARTS_WITH_UPPER = /^[A-Z]/;

const isComponentExport = (declaration) => {
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.some((d) => d.id?.type === 'Identifier' && STARTS_WITH_UPPER.test(d.id.name));
  }
  if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
    return declaration.id && STARTS_WITH_UPPER.test(declaration.id.name);
  }
  return false;
};

export const noMultiComponent = {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow multiple components in the same file' },
    messages: {
      tooMany: 'This file has {{ count }} components. Only 1 component per file is allowed.',
    },
    schema: [],
  },
  create(context) {
    const components = [];

    return {
      ExportDefaultDeclaration() {
        components.push(true);
      },
      ExportNamedDeclaration(node) {
        const { declaration } = node;
        if (declaration && isComponentExport(declaration)) {
          components.push(true);
        }
      },
      'Program:exit'() {
        if (components.length > 1) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'tooMany',
            data: { count: String(components.length) },
          });
        }
      },
    };
  },
};
