// apps/service/src/campaigns/index.ts
import { getDb } from '../db.js'

interface Campaign {
  id: string
  name: string
  game_id: string
  max_plays: number
  start_at: string
  end_at: string
  config: string
}

export function getCampaign(id: string): Campaign | null {
  return (getDb().prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Campaign) ?? null
}

export function getConfig(campaignId: string): Record<string, unknown> {
  const campaign = getCampaign(campaignId)
  if (!campaign) return {}
  return JSON.parse(campaign.config) as Record<string, unknown>
}

export function getMaxPlays(campaignId: string): number {
  const campaign = getCampaign(campaignId)
  return campaign?.max_plays ?? 0
}
