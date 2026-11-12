import { describe, expect, it } from 'vitest'
import { adminFromSearch, adminFromStorage, adminToStorage } from './admin-flag.ts'

describe('admin menu flag', () => {
  it('turns on from ?admin=1 and off from ?admin=0, and otherwise keeps the stored value', () => {
    expect(adminFromSearch('?admin=1', false)).toEqual({ on: true, persist: true })
    expect(adminFromSearch('admin=0', true)).toEqual({ on: false, persist: true })
    expect(adminFromSearch('?x=1', true)).toEqual({ on: true, persist: false })
    expect(adminFromSearch('', false)).toEqual({ on: false, persist: false })
    expect(adminFromStorage(null)).toBe(false)
    expect(adminFromStorage('1')).toBe(true)
    expect(adminFromStorage('0')).toBe(false)
    expect(adminToStorage(true)).toBe('1')
    expect(adminToStorage(false)).toBe('0')
  })
})
