// no-prisma-outside-persistence
// Qué hace: prohíbe usar el cliente Prisma fuera de la capa de persistencia/repositorios.
// Para qué: aislar el acceso a datos; los servicios no tocan Prisma directo (§9).
export const noPrismaOutsidePersistence = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Prisma queries should only be in persistence/ files' },
    messages: {
      foundPrisma: 'Prisma queries belong in a `persistence/` file.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const isInAllowedDir = filename.includes('/persistence/') || filename.includes('\\persistence\\');
    if (isInAllowedDir) return {};

    return {
      MemberExpression(node) {
        if (node.object.type === 'Identifier' && node.object.name === 'prisma') {
          context.report({ node, messageId: 'foundPrisma' });
        }
      },
    };
  },
};
