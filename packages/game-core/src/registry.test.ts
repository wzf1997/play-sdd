import { describe, it, expect, beforeEach } from 'vitest'
import { registerGame, getGame, clearRegistry } from './registry.js'
import type { GamePlugin } from './types.js'
import { createElement } from 'react'

const mockPlugin: GamePlugin = {
  id: 'test-game',
  component: () => createElement('div', null, 'test'),
  bffRoutes: [],
}

describe('game registry', () => {
  beforeEach(() => clearRegistry())

  it('registers and retrieves a plugin', () => {
    registerGame(mockPlugin)
    expect(getGame('test-game')).toBe(mockPlugin)
  })

  it('returns undefined for unregistered game', () => {
    expect(getGame('not-exist')).toBeUndefined()
  })

  it('does not throw on missing game', () => {
    expect(() => getGame('missing')).not.toThrow()
  })
})
