// apps/service/src/prizes/prizes.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, getDb } from '../db.js'
import { drawPrize, issuePrizeById } from './index.js'

describe('drawPrize', () => {
  beforeEach(() => {
    initDb(':memory:')
    const db = getDb()
    db.prepare(`INSERT INTO campaigns VALUES ('c1','test','grid9',3,'2026-01-01','2099-01-01','{}',datetime('now'))`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p1','c1','大奖','coupon',10,-1)`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p2','c1','无库存','virtual',10,0)`).run()
  })

  it('returns a prize with valid fields', () => {
    const prize = drawPrize('c1')
    expect(prize).not.toBeNull()
    expect(prize!.id).toBe('p1')
    expect(['virtual','physical','coupon']).toContain(prize!.type)
  })

  it('skips out-of-stock prizes', () => {
    const db = getDb()
    db.prepare(`UPDATE prizes SET stock=0 WHERE id='p1'`).run()
    const prize = drawPrize('c1')
    expect(prize).toBeNull()
  })
})

describe('issuePrizeById', () => {
  beforeEach(() => {
    initDb(':memory:')
    const db = getDb()
    db.prepare(`INSERT INTO campaigns VALUES ('c1','test','grid9',3,'2026-01-01','2099-01-01','{}',datetime('now'))`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p1','c1','特等奖','physical',1,3)`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p2','c1','无限奖','virtual',1,-1)`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p3','c1','无库存','coupon',1,0)`).run()
  })

  it('returns prize and decrements finite stock', () => {
    const prize = issuePrizeById('p1')
    expect(prize).not.toBeNull()
    expect(prize!.id).toBe('p1')
    expect(prize!.name).toBe('特等奖')
    const stock = getDb().prepare(`SELECT stock FROM prizes WHERE id='p1'`).get() as { stock: number }
    expect(stock.stock).toBe(2)
  })

  it('returns prize without decrementing infinite stock', () => {
    const prize = issuePrizeById('p2')
    expect(prize).not.toBeNull()
    const stock = getDb().prepare(`SELECT stock FROM prizes WHERE id='p2'`).get() as { stock: number }
    expect(stock.stock).toBe(-1)
  })

  it('returns null when prize is out of stock', () => {
    const prize = issuePrizeById('p3')
    expect(prize).toBeNull()
  })

  it('returns null when prize id does not exist', () => {
    const prize = issuePrizeById('nonexistent')
    expect(prize).toBeNull()
  })
})
