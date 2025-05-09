import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    testTimeout: 20000 * 1000,
    env: loadEnv('', process.cwd(), '')
  }
})
