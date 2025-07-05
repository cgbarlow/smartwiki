import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
        },
      },
      exclude: [
        'node_modules/',
        'src/test/',
        'tests/',
        'coverage/',
        'dist/',
        'prisma/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts',
        'src/scripts/',
      ],
      include: [
        'src/**/*.{ts,js}',
      ],
    },
    include: [
      'src/**/*.{test,spec}.{ts,js}',
      'tests/unit/**/*.{test,spec}.{ts,js}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/e2e/',
      'tests/integration/',
    ],
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    // Separate configurations for different test types
    workspace: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{ts,js}', 'tests/unit/**/*.{test,spec}.{ts,js}'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.{test,spec}.{ts,js}'],
          environment: 'node',
          testTimeout: 30000,
          setupFiles: ['./src/test/setup.ts', './tests/setup/integration-setup.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/middleware': path.resolve(__dirname, './src/middleware'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },
});