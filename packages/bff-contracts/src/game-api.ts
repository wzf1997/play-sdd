import type { Prize } from '@paly-sdd/game-core'

export interface InitRequest {
  userId: string
  campaignId: string
}

export interface InitResponse {
  config: Record<string, unknown>
  remainingPlays: number
}

export interface PlayRequest {
  userId: string
  campaignId: string
}

export interface TaskUpdate {
  taskId: string
  previousCount: number
  currentCount: number
  completed: boolean
}

export interface PlayResponse {
  prize: Prize | null
  remainingPlays: number
  taskUpdates: TaskUpdate[]
}

export interface Task {
  id: string
  title: string
  description: string
  type: 'once' | 'cumulative'
  targetCount: number
  trigger: 'play' | 'win'
  prizeId: string
}

export interface TaskWithProgress extends Task {
  currentCount: number
  status: 'in_progress' | 'completed' | 'claimed'
}

export interface ClaimRequest {
  userId: string
  campaignId: string
}

export interface ClaimResponse {
  prize: Prize
}

export interface ResultRecord {
  prize: Prize
  playedAt: string
}

export interface ResultResponse {
  records: ResultRecord[]
}

export interface ErrorResponse {
  error: string
}
