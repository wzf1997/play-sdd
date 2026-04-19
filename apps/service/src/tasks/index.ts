import { randomUUID } from 'crypto'
import { getDb } from '../db.js'
import { issuePrizeById } from '../prizes/index.js'
import type { Prize } from '@paly-sdd/game-core'

interface TaskRow {
  id: string
  campaign_id: string
  title: string
  description: string
  type: 'once' | 'cumulative'
  target_count: number
  trigger: 'play' | 'win'
  prize_id: string
  sort_order: number
}

interface ProgressRow {
  id: string
  user_id: string
  task_id: string
  campaign_id: string
  current_count: number
  status: 'in_progress' | 'completed' | 'claimed'
  completed_at: string | null
  claimed_at: string | null
}

export interface TaskWithProgress {
  id: string
  title: string
  description: string
  type: 'once' | 'cumulative'
  targetCount: number
  trigger: 'play' | 'win'
  prizeId: string
  currentCount: number
  status: 'in_progress' | 'completed' | 'claimed'
}

export interface TaskUpdate {
  taskId: string
  previousCount: number
  currentCount: number
  completed: boolean
}

export function getTasksWithProgress(userId: string, campaignId: string): TaskWithProgress[] {
  const db = getDb()
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE campaign_id = ? ORDER BY sort_order')
    .all(campaignId) as TaskRow[]

  return tasks.map((task) => {
    const progress = db
      .prepare('SELECT * FROM user_task_progress WHERE user_id = ? AND task_id = ?')
      .get(userId, task.id) as ProgressRow | undefined

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      targetCount: task.target_count,
      trigger: task.trigger,
      prizeId: task.prize_id,
      currentCount: progress?.current_count ?? 0,
      status: progress?.status ?? 'in_progress',
    }
  })
}

export function updateTaskProgress(
  userId: string,
  campaignId: string,
  trigger: 'play' | 'win'
): TaskUpdate[] {
  const db = getDb()
  return db.transaction((): TaskUpdate[] => {
    const tasks = db
      .prepare('SELECT * FROM tasks WHERE campaign_id = ? AND trigger = ?')
      .all(campaignId, trigger) as TaskRow[]

    const updates: TaskUpdate[] = []

    for (const task of tasks) {
      const existing = db
        .prepare('SELECT * FROM user_task_progress WHERE user_id = ? AND task_id = ?')
        .get(userId, task.id) as ProgressRow | undefined

      if (existing?.status === 'claimed' || existing?.status === 'completed') continue

      const previousCount = existing?.current_count ?? 0
      const newCount = previousCount + 1
      const isCompleted = newCount >= task.target_count
      const now = new Date().toISOString()

      if (!existing) {
        db.prepare(
          `INSERT INTO user_task_progress
           (id, user_id, task_id, campaign_id, current_count, status, completed_at, claimed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          randomUUID(),
          userId,
          task.id,
          campaignId,
          newCount,
          isCompleted ? 'completed' : 'in_progress',
          isCompleted ? now : null,
          null
        )
      } else {
        db.prepare(
          `UPDATE user_task_progress
           SET current_count = ?, status = ?, completed_at = ?
           WHERE user_id = ? AND task_id = ?`
        ).run(newCount, isCompleted ? 'completed' : 'in_progress', isCompleted ? now : null, userId, task.id)
      }

      updates.push({ taskId: task.id, previousCount, currentCount: newCount, completed: isCompleted })
    }

    return updates
  })()
}

export function claimTask(userId: string, taskId: string, campaignId: string): Prize {
  const db = getDb()

  const progress = db
    .prepare('SELECT * FROM user_task_progress WHERE user_id = ? AND task_id = ? AND campaign_id = ?')
    .get(userId, taskId, campaignId) as ProgressRow | undefined

  if (!progress || progress.status !== 'completed') {
    throw Object.assign(new Error('task not claimable'), { statusCode: 409 })
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined
  if (!task) throw Object.assign(new Error('task not found'), { statusCode: 404 })

  const prize = issuePrizeById(task.prize_id)
  if (!prize) throw Object.assign(new Error('prize not available'), { statusCode: 410 })

  db.prepare(
    `UPDATE user_task_progress SET status = 'claimed', claimed_at = ? WHERE user_id = ? AND task_id = ?`
  ).run(new Date().toISOString(), userId, taskId)

  return prize
}
