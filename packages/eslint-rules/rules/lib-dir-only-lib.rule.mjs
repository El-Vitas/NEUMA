// lib-dir-only-lib
// Qué hace: dentro de `lib/`, solo permite helpers/utilidades puras.
// Para qué: que `lib/` no acumule componentes, tipos, constantes ni schemas (§1.1).
import { eachExportedVariableDeclarator } from './dir-only-exports.util.mjs';

const STARTS_WITH_UPPERCASE = /^[A-Z]/;

const isZodSchema = (node) => {
  if (node.init?.type !== 'CallExpression') return false;
  const callee = node.init.callee;
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'z') {
    return true;
  }
  return false;
};

export const libDirOnlyLib = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only pure utility functions are allowed in lib/ directory' },
    messages: {
      foundComponent: 'Components do not belong in `lib/`. Move it to `components/`.',
      foundSchema: 'Zod schemas do not belong in `lib/`. Move it to `schemas/`.',
      foundType: 'Types and interfaces do not belong in `lib/`. Move it to `types/`.',
      foundOther: 'Only utility functions belong in `lib/`. Move this to its proper directory.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/lib/') && !filename.includes('\\lib\\')) return {};

    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;

        for (const declarator of eachExportedVariableDeclarator(node)) {
          if (STARTS_WITH_UPPERCASE.test(declarator.id.name)) {
            context.report({ node, messageId: 'foundComponent' });
            return;
          }
          if (isZodSchema(declarator)) {
            context.report({ node, messageId: 'foundSchema' });
            return;
          }
        }

        if (decl.type === 'FunctionDeclaration' && decl.id && STARTS_WITH_UPPERCASE.test(decl.id.name)) {
          context.report({ node, messageId: 'foundComponent' });
        }
      },
      TSInterfaceDeclaration(node) {
        context.report({ node, messageId: 'foundType' });
      },
      TSTypeAliasDeclaration(node) {
        context.report({ node, messageId: 'foundType' });
      },
    };
  },
};
