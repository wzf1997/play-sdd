import { describe, it, expect, afterEach } from 'vitest'
import { initDb, getDb } from './db.js'
import fs from 'fs'

const TEST_DB = ':memory:'

describe('database initialization', () => {
  afterEach(() => {
    getDb().close()
  })

  it('creates campaigns table', () => {
    initDb(TEST_DB)
    const db = getDb()
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'"
    ).get()
    expect(row).toBeTruthy()
  })

  it('creates prizes table', () => {
    initDb(TEST_DB)
    const db = getDb()
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prizes'"
    ).get()
    expect(row).toBeTruthy()
  })

  it('creates user_plays table', () => {
    initDb(TEST_DB)
    const db = getDb()
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_plays'"
    ).get()
    expect(row).toBeTruthy()
  })
})
