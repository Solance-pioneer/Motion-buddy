import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const customer = ['index.html', 'src/main.tsx', 'src/App.tsx', 'src/view/Controls.tsx']
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n')

describe('customer boundary', () => {
  it('does not mount the owner audition', () => {
    for (const term of ['ReviewDeck', 'Export review', 'Face audition', 'Owner audition', 'motion-buddy-review']) {
      expect(customer.includes(term), term).toBe(false)
    }
  })
})
