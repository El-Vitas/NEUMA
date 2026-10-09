const API_V1_PATTERN = /\/api\/v1\//;
const API_CLIENT_METHODS = new Set(['get', 'post', 'put', 'patch', 'del']);

export const noDirectFetch = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe fetch() directo o api.{get,post,...}() desde componentes. Server first: toda comunicación con la API va por server actions/queries.',
    },
    messages: {
      foundDirectFetch:
        'No uses fetch() directo a la API interna desde el cliente. Crea una server action/query y llamala desde el componente.',
      foundApiClient:
        'No uses api.{method}() desde el cliente. api-client.ts no existe — toda comunicación con la API va por server actions/queries.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        if (callee.type === 'Identifier' && callee.name === 'fetch') {
          const firstArg = node.arguments[0];
          if (!firstArg) return;
          let urlValue = '';
          if (firstArg.type === 'TemplateLiteral') {
            urlValue = firstArg.quasis.map((q) => q.value.raw).join('');
          } else if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            urlValue = firstArg.value;
          }
          if (API_V1_PATTERN.test(urlValue)) {
            context.report({ node, messageId: 'foundDirectFetch' });
          }
          return;
        }

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'api' &&
          callee.property.type === 'Identifier' &&
          API_CLIENT_METHODS.has(callee.property.name)
        ) {
          context.report({ node, messageId: 'foundApiClient' });
        }
      },
    };
  },
};
