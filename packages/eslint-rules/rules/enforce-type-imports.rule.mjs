// enforce-type-imports
// Qué hace: obliga a usar `import type` para imports que son solo de tipos.
// Para qué: mantener separados los imports de runtime de los de tipos (tree-shaking, claridad).
const NESTJS_CLASS_DECORATORS = new Set([
  'Injectable',
  'Controller',
  'Module',
  'Global',
  'Catch',
  'Resolver',
  'WebSocketGateway',
]);

const isTypeOnlyContext = (node) => {
  let current = node.parent;
  while (current) {
    const type = current.type;
    if (
      type === 'TSTypeReference' ||
      type === 'TSTypeAnnotation' ||
      type === 'TSTypeParameterDeclaration' ||
      type === 'TSTypeParameterInstantiation' ||
      type === 'TSTypeQuery' ||
      type === 'TSQualifiedName' ||
      type === 'TSImportType'
    ) {
      return true;
    }
    if (type === 'ClassDeclaration' || type === 'FunctionDeclaration' || type === 'VariableDeclaration') {
      return false;
    }
    if (type === 'ExpressionStatement' || type === 'CallExpression' || type === 'NewExpression') {
      return false;
    }
    current = current.parent;
  }
  return false;
};

export const enforceTypeImports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce import type for imports only used as types, respecting NestJS DI.' },
    messages: {
      useInlineType: 'Use inline `type` modifier for this type-only import.',
      useImportType: 'Use `import type` for this type-only import.',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    const nestJsDiTokens = new Set();
    const importNodes = [];

    return {
      ClassDeclaration(node) {
        const decorators = node.decorators ?? [];
        const hasNestDecorator = decorators.some((d) => {
          const expr = d.expression;
          const name = expr.type === 'CallExpression' ? expr.callee.name : expr.name;
          return NESTJS_CLASS_DECORATORS.has(name);
        });

        if (!hasNestDecorator) return;

        const ctor = node.body.body.find((m) => m.type === 'MethodDefinition' && m.kind === 'constructor');
        if (!ctor) return;

        for (const param of ctor.value.params) {
          const typeAnn = param.typeAnnotation?.typeAnnotation;
          if (typeAnn?.type === 'TSTypeReference' && typeAnn.typeName.type === 'Identifier') {
            nestJsDiTokens.add(typeAnn.typeName.name);
          }
        }
      },

      ImportDeclaration(node) {
        if (node.importKind === 'type') return;
        importNodes.push(node);
      },

      'Program:exit'() {
        for (const node of importNodes) {
          const specifiers = node.specifiers ?? [];
          if (specifiers.length === 0) continue;

          const typeOnlySpecifiers = [];

          for (const spec of specifiers) {
            if (spec.type !== 'ImportSpecifier') continue;
            if (spec.importKind === 'type') continue;

            const localName = spec.local.name;
            if (nestJsDiTokens.has(localName)) continue;

            const variable = sourceCode.getDeclaredVariables?.(spec)?.[0];
            if (!variable) continue;

            const hasValueUse = variable.references.some((ref) => !isTypeOnlyContext(ref.identifier));

            if (!hasValueUse) {
              typeOnlySpecifiers.push(spec);
            }
          }

          if (typeOnlySpecifiers.length === 0) continue;

          const valueSpecifiers = specifiers.filter((s) => {
            if (s.type !== 'ImportSpecifier') return false;
            if (s.importKind === 'type') return false;
            return !typeOnlySpecifiers.includes(s);
          });

          const allAreTypeOnly = valueSpecifiers.length === 0;

          if (allAreTypeOnly) {
            context.report({
              node,
              messageId: 'useImportType',
              fix(fixer) {
                const importToken = sourceCode.getFirstToken(node, { filter: (t) => t.value === 'import' });
                return fixer.insertTextAfter(importToken, ' type');
              },
            });
          } else {
            for (const spec of typeOnlySpecifiers) {
              context.report({
                node: spec,
                messageId: 'useInlineType',
                fix(fixer) {
                  return fixer.insertTextBefore(spec, 'type ');
                },
              });
            }
          }
        }
      },
    };
  },
};
