import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    queryEngine: 'src/queryEngine.ts',
    errors: 'src/errors.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  shims: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'node18',
  // Externalize Prisma packages - they should come from the consumer's node_modules
  external: ['@prisma/generator-helper', '@prisma/client', 'prisma'],
});
