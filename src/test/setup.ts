import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'

const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext

beforeAll(() => {
  // VexFlow uses a canvas only for text measurement while testing its SVG renderer.
  HTMLCanvasElement.prototype.getContext = (() => ({
    measureText: (text: string) => ({
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
      width: text.length * 10,
    }),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalCanvasGetContext
})

afterEach(() => {
  cleanup()
})
