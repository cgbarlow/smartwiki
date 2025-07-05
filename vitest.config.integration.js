/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/integration-setup.js'],
    include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'tests/unit/**',
      'tests/e2e/**',
      'tests/performance/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}',
        'src/**/index.{js,ts}'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        minThreads: 1,
        maxThreads: 2
      }
    },
    sequence: {
      concurrent: false
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests')
    }
  }
})