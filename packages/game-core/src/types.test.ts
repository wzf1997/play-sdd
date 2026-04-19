import { describe, it, expectTypeOf } from 'vitest'
import type { GamePlugin, GameProps, Prize, BffRoute } from './types.js'

describe('GamePlugin types', () => {
  it('Prize has id, name, type', () => {
    const p: Prize = { id: '1', name: '优惠券', type: 'coupon' }
    expectTypeOf(p.type).toEqualTypeOf<'virtual' | 'physical' | 'coupon'>()
  })

  it('GameProps has required fields', () => {
    type RequiredKeys = 'campaignId' | 'maxPlays' | 'onResult'
    expectTypeOf<keyof GameProps>().toMatchTypeOf<RequiredKeys>()
  })
})
