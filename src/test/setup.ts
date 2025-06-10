import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock the MSW browser module for tests
vi.mock('../api/mocks/browser', () => ({
  worker: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined)
  },
  startMockService: vi.fn().mockResolvedValue(undefined)
}))

// Global test setup
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000'
  },
  writable: true
})