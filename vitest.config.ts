import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  // Disable Vite's dependency pre-bundling scan. Without this, loading
  // @testing-library/jest-dom in the client setup triggers an esbuild
  // optimize pass that breaks resolution of relative `.ts` imports
  // (the project uses allowImportingTsExtensions) in the node project.
  optimizeDeps: { entries: [] },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'server/lib/**', 'server/auth/**', 'server/routes/**',
        'lib/**', 'src/lib/**', 'src/pages/**', 'src/components/layout/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['tests/server/**/*.test.ts', 'tests/shared/**/*.test.ts'],
          exclude: ['tests/server/sql/**/*.test.ts'],
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
      {
        extends: true,
        test: {
          name: 'server-sql',
          environment: 'node',
          include: ['tests/server/sql/**/*.test.ts'],
          globalSetup: ['./tests/server/sql/globalSetup.ts'],
          setupFiles: ['./tests/server/sql/setup.ts'],
          testTimeout: 60000,
          hookTimeout: 120000,
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          maxWorkers: 1,
          sequence: {
            concurrent: false,
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.client.ts'],
          include: ['tests/client/**/*.test.tsx'],
        },
      },
    ],
  },
});
