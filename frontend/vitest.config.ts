import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
      exclude: [
        'node_modules/',
        'src/test/',
        'tests/',
        'coverage/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts',
        'src/components/ui/', // UI library components
        'src/pages/_app.tsx',
        'src/pages/_document.tsx',
      ],
      include: [
        'src/**/*.{ts,tsx}',
      ],
    },
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/e2e/',
      'tests/integration/',
    ],
    // Separate configurations for different test types
    workspace: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
          testTimeout: 30000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },
});