// apps/service/src/users/users.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, getDb } from '../db.js'
import { getRemainingPlays, recordPlay } from './index.js'

describe('users module', () => {
  beforeEach(() => {
    initDb(':memory:')
    const db = getDb()
    db.prepare(`INSERT INTO campaigns VALUES ('c1','test','grid9',3,'2026-01-01','2099-01-01','{}',datetime('now'))`).run()
  })

  it('returns maxPlays when no plays recorded', () => {
    expect(getRemainingPlays('u1', 'c1')).toBe(3)
  })

  it('decrements remaining plays after recording', () => {
    recordPlay('u1', 'c1', 'grid9', null)
    expect(getRemainingPlays('u1', 'c1')).toBe(2)
  })

  it('returns 0 when all plays used', () => {
    recordPlay('u1', 'c1', 'grid9', null)
    recordPlay('u1', 'c1', 'grid9', null)
    recordPlay('u1', 'c1', 'grid9', null)
    expect(getRemainingPlays('u1', 'c1')).toBe(0)
  })
})
