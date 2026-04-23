import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node18',
  outDir: 'build',
  clean: true,
  sourcemap: false,
  external: ['react', 'react-devtools-core'],
  define: {
    'process.env.APP_VERSION': JSON.stringify(pkg.version),
    'process.env.NODE_ENV': '"production"',
    '__TEST_MODE__': 'false',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
