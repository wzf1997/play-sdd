import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { initDb, getDb } from '../db.js'
import { getTasksWithProgress, updateTaskProgress, claimTask } from './index.js'

function seed() {
  const db = getDb()
  db.prepare(`INSERT INTO campaigns VALUES ('c1','test','grid9',3,'2026-01-01','2099-01-01','{}',datetime('now'))`).run()
  db.prepare(`INSERT INTO prizes VALUES ('prize-task','c1','任务奖品','virtual',1,-1)`).run()
  db.prepare(`INSERT INTO prizes VALUES ('prize-win','c1','赢奖奖品','coupon',1,-1)`).run()
  db.prepare(
    `INSERT INTO tasks VALUES ('t-once','c1','首次游玩','首次体验','once',1,'play','prize-task',1)`
  ).run()
  db.prepare(
    `INSERT INTO tasks VALUES ('t-cumul','c1','累计3次','游玩3次','cumulative',3,'play','prize-task',2)`
  ).run()
  db.prepare(
    `INSERT INTO tasks VALUES ('t-win','c1','赢得奖品','赢一次','once',1,'win','prize-win',3)`
  ).run()
}

beforeEach(() => {
  initDb(':memory:')
  seed()
})

describe('getTasksWithProgress', () => {
  it('returns all tasks with default in_progress status for new user', () => {
    const tasks = getTasksWithProgress('u1', 'c1')
    expect(tasks).toHaveLength(3)
    expect(tasks[0].currentCount).toBe(0)
    expect(tasks[0].status).toBe('in_progress')
  })

  it('returns updated counts after progress exists', () => {
    getDb().prepare(
      `INSERT INTO user_task_progress VALUES (?, 'u1', 't-once', 'c1', 1, 'completed', datetime('now'), NULL)`
    ).run(randomUUID())
    const tasks = getTasksWithProgress('u1', 'c1')
    const once = tasks.find(t => t.id === 't-once')!
    expect(once.currentCount).toBe(1)
    expect(once.status).toBe('completed')
  })
})

describe('updateTaskProgress', () => {
  it('increments play-triggered tasks on play', () => {
    const updates = updateTaskProgress('u1', 'c1', 'play')
    expect(updates).toHaveLength(2)  // t-once and t-cumul
    const once = updates.find(u => u.taskId === 't-once')!
    expect(once.previousCount).toBe(0)
    expect(once.currentCount).toBe(1)
    expect(once.completed).toBe(true)
  })

  it('does not increment win-triggered tasks on plain play', () => {
    const updates = updateTaskProgress('u1', 'c1', 'play')
    expect(updates.find(u => u.taskId === 't-win')).toBeUndefined()
  })

  it('increments win-triggered task when trigger is win', () => {
    const updates = updateTaskProgress('u1', 'c1', 'win')
    expect(updates).toHaveLength(1)
    expect(updates[0].taskId).toBe('t-win')
    expect(updates[0].completed).toBe(true)
  })

  it('sets status to completed when count reaches target', () => {
    updateTaskProgress('u1', 'c1', 'play')
    updateTaskProgress('u1', 'c1', 'play')
    const updates = updateTaskProgress('u1', 'c1', 'play')
    const cumul = updates.find(u => u.taskId === 't-cumul')!
    expect(cumul.currentCount).toBe(3)
    expect(cumul.completed).toBe(true)
  })

  it('skips already completed tasks', () => {
    updateTaskProgress('u1', 'c1', 'play')  // completes t-once
    const updates = updateTaskProgress('u1', 'c1', 'play')
    expect(updates.find(u => u.taskId === 't-once')).toBeUndefined()
  })

  it('skips already claimed tasks', () => {
    getDb().prepare(
      `INSERT INTO user_task_progress VALUES (?, 'u1', 't-once', 'c1', 1, 'claimed', datetime('now'), datetime('now'))`
    ).run(randomUUID())
    const updates = updateTaskProgress('u1', 'c1', 'play')
    expect(updates.find(u => u.taskId === 't-once')).toBeUndefined()
  })
})

describe('claimTask', () => {
  it('issues prize and marks task as claimed', () => {
    updateTaskProgress('u1', 'c1', 'play')  // completes t-once
    const prize = claimTask('u1', 't-once', 'c1')
    expect(prize.id).toBe('prize-task')
    const row = getDb()
      .prepare(`SELECT status FROM user_task_progress WHERE user_id='u1' AND task_id='t-once'`)
      .get() as { status: string }
    expect(row.status).toBe('claimed')
  })

  it('throws 409 when task is not completed', () => {
    let caught: unknown
    try { claimTask('u1', 't-once', 'c1') } catch (e) { caught = e }
    expect((caught as { statusCode: number }).statusCode).toBe(409)
  })

  it('throws 409 when task is already claimed', () => {
    updateTaskProgress('u1', 'c1', 'play')
    claimTask('u1', 't-once', 'c1')
    let caught: unknown
    try { claimTask('u1', 't-once', 'c1') } catch (e) { caught = e }
    expect((caught as { statusCode: number }).statusCode).toBe(409)
  })
})
