import { describe, expect, it } from 'vitest'
import { isMockServerEnabled } from './config'

describe('isMockServerEnabled', () => {
  it('returns true for supported opt-in values', () => {
    expect(isMockServerEnabled('true')).toBe(true)
    expect(isMockServerEnabled('ON')).toBe(true)
    expect(isMockServerEnabled(' 1 ')).toBe(true)
  })

  it('returns false when mocks are not explicitly enabled', () => {
    expect(isMockServerEnabled()).toBe(false)
    expect(isMockServerEnabled('false')).toBe(false)
    expect(isMockServerEnabled('')).toBe(false)
  })
})
