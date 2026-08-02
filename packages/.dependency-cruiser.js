/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'Este archivo no tiene dependencias entrantes ni salientes — es código muerto, seguro de eliminar.',
      from: { orphan: true },
      to: {},
    },
  ],
  options: {
    doNotFollow: 'node_modules',
    exclude: { path: '\\.next|packages/[^/]+/dist/|dist/' },
    tsPreCompilationDeps: true,
  },
};
