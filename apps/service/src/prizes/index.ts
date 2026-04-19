// apps/service/src/prizes/index.ts
import { getDb } from '../db.js'
import type { Prize } from '@paly-sdd/game-core'

interface PrizeRow {
  id: string
  campaign_id: string
  name: string
  type: 'virtual' | 'physical' | 'coupon'
  weight: number
  stock: number
}

export function drawPrize(campaignId: string): Prize | null {
  const rows = getDb()
    .prepare('SELECT * FROM prizes WHERE campaign_id = ? AND (stock = -1 OR stock > 0)')
    .all(campaignId) as PrizeRow[]

  if (rows.length === 0) return null

  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * totalWeight
  let selected = rows[rows.length - 1]  // fallback to last item
  for (const row of rows) {
    rand -= row.weight
    if (rand <= 0) {
      selected = row
      break
    }
  }

  // decrement stock if finite
  if (selected.stock > 0) {
    getDb().prepare('UPDATE prizes SET stock = stock - 1 WHERE id = ?').run(selected.id)
  }
  return { id: selected.id, name: selected.name, type: selected.type }
}

export function getPrizeById(id: string): Prize | null {
  const row = getDb().prepare('SELECT * FROM prizes WHERE id = ?').get(id) as PrizeRow | undefined
  if (!row) return null
  return { id: row.id, name: row.name, type: row.type }
}

export function issuePrizeById(prizeId: string): Prize | null {
  const row = getDb()
    .prepare('SELECT * FROM prizes WHERE id = ? AND (stock = -1 OR stock > 0)')
    .get(prizeId) as PrizeRow | undefined
  if (!row) return null
  if (row.stock > 0) {
    getDb().prepare('UPDATE prizes SET stock = stock - 1 WHERE id = ?').run(prizeId)
  }
  return { id: row.id, name: row.name, type: row.type }
}
