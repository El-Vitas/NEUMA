// no-then-async
// Qué hace: prohíbe mezclar `.then()` con `async/await` en el mismo contexto async.
// Para qué: consistencia de control de flujo asíncrono; usar `await` de forma pareja.
const THEN_NODE_KEYS = [
  'body',
  'expression',
  'block',
  'consequent',
  'alternate',
  'test',
  'handler',
  'finalizer',
  'object',
  'callee',
  'arguments',
  'elements',
  'declarations',
  'init',
  'left',
  'right',
  'expressions',
  'argument',
  'value',
];

const isThenCall = (node) =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  node.callee.property.type === 'Identifier' &&
  node.callee.property.name === 'then';

const walkChildren = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  for (const key of THEN_NODE_KEYS) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c?.type) visit(c);
      }
    } else if (child?.type) {
      visit(child);
    }
  }
};

const checkThenCalls = (node, report) => {
  if (!node) return;
  if (isThenCall(node)) report(node);
  walkChildren(node, (child) => checkThenCalls(child, report));
};

const createAsyncVisitor = (context) => {
  let inAsyncContext = false;

  const enterAsync = (node, bodyAccessor) => {
    const wasInAsync = inAsyncContext;
    inAsyncContext = node.async || inAsyncContext;
    if (inAsyncContext) {
      const body = typeof bodyAccessor === 'function' ? bodyAccessor(node) : node.body;
      if (body) checkThenCalls(body, (n) => context.report({ node: n, messageId: 'foundThen' }));
    }
    inAsyncContext = wasInAsync;
  };

  return {
    ArrowFunctionExpression: (node) => enterAsync(node),
    FunctionDeclaration: (node) => enterAsync(node),
    FunctionExpression: (node) => enterAsync(node),
    MethodDefinition: (node) => enterAsync(node.value, (n) => n.body),
  };
};

export const noThenAsync = {
  meta: {
    type: 'suggestion',
    docs: { description: "don't mix .then() with async/await" },
    messages: {
      foundThen: 'No mezcles `.then()` con `async/await`. Usa `await` consistentemente.',
    },
    schema: [],
  },
  create(context) {
    return createAsyncVisitor(context);
  },
};
