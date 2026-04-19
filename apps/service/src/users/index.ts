// apps/service/src/users/index.ts
import { randomUUID } from 'crypto'
import { getDb } from '../db.js'
import { getMaxPlays } from '../campaigns/index.js'

export function getRemainingPlays(userId: string, campaignId: string): number {
  const played = (
    getDb()
      .prepare('SELECT COUNT(*) as count FROM user_plays WHERE user_id = ? AND campaign_id = ?')
      .get(userId, campaignId) as { count: number }
  ).count
  const max = getMaxPlays(campaignId)
  return Math.max(0, max - played)
}

export function recordPlay(
  userId: string,
  campaignId: string,
  gameId: string,
  prizeId: string | null
): void {
  getDb()
    .prepare(
      'INSERT INTO user_plays (id, user_id, campaign_id, game_id, prize_id, played_at) VALUES (?,?,?,?,?,?)'
    )
    .run(randomUUID(), userId, campaignId, gameId, prizeId, new Date().toISOString())
}

export function getPlayHistory(
  userId: string,
  campaignId: string
): Array<{ prize_id: string | null; played_at: string }> {
  return getDb()
    .prepare(
      'SELECT prize_id, played_at FROM user_plays WHERE user_id = ? AND campaign_id = ? ORDER BY played_at DESC'
    )
    .all(userId, campaignId) as Array<{ prize_id: string | null; played_at: string }>
}
