import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node18',
  outDir: 'build',
  clean: true,
  sourcemap: true,
  external: ['react', 'react-devtools-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
