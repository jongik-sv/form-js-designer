import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**'],
    environmentMatchGlobs: [
      // preview.test.ts는 DOM API가 필요하므로 jsdom 환경으로 실행
      ['test/unit/preview.test.ts', 'jsdom'],
      // errorBanner.test.ts, preview-cache.test.ts도 DOM API 필요
      ['test/unit/errorBanner.test.ts', 'jsdom'],
      ['test/unit/preview-cache.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/**'],
    },
  },
});
