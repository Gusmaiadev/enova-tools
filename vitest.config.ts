import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // 'server-only' lanca no ambiente node do vitest; troca por um stub vazio.
      'server-only': resolve(__dirname, 'test/stub-server-only.ts'),
      '@': resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
