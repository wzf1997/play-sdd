# Task System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a player-facing task system where completing in-game actions (play / win) progresses tasks and rewards prizes on claim.

**Architecture:** Task progress is embedded in the existing `/play` call chain — after recording each play result, the Service layer synchronously updates `user_task_progress` and returns `taskUpdates[]` in the play response. A new `TaskList` component in DemoCampaign re-fetches task state after each play and lets players claim completed tasks.

**Tech Stack:** better-sqlite3 (Service DB), Fastify (Service + BFF routes), React + Vitest (frontend component + tests), undici fetch (BFF proxy), `@paly-sdd/bff-contracts` (shared types)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/bff-contracts/src/game-api.ts` | Modify | Add Task*, TaskUpdate, ClaimRequest/Response; extend PlayResponse |
| `packages/bff-contracts/src/index.ts` | Modify | Export new types |
| `apps/service/src/db.ts` | Modify | CREATE TABLE tasks + user_task_progress |
| `apps/service/src/prizes/index.ts` | Modify | Add `issuePrizeById()` |
| `apps/service/src/tasks/index.ts` | Create | getTasksWithProgress, updateTaskProgress, claimTask |
| `apps/service/src/tasks/tasks.test.ts` | Create | Unit tests for all three functions |
| `apps/service/src/seed.ts` | Modify | Seed demo tasks for all 3 campaigns |
| `apps/service/src/routes/game.ts` | Modify | Extend play handler; add GET /tasks + POST /tasks/:id/claim |
| `apps/bff/src/routes/game/tasks.ts` | Create | Proxy GET /api/game/tasks + POST /api/game/tasks/:taskId/claim |
| `apps/bff/src/server.ts` | Modify | Register taskRoutes |
| `apps/web/src/pages/DemoCampaign/TaskList.tsx` | Create | TaskList + TaskCard component |
| `apps/web/src/pages/DemoCampaign/TaskList.css` | Create | TaskList styles |
| `apps/web/src/pages/DemoCampaign/TaskList.test.tsx` | Create | Frontend unit tests |
| `apps/web/src/pages/DemoCampaign/index.tsx` | Modify | Mount TaskList; pass playCount prop |

---

## Task 1: Add task types to bff-contracts

**Files:**
- Modify: `packages/bff-contracts/src/game-api.ts`
- Modify: `packages/bff-contracts/src/index.ts`

- [ ] **Step 1: Add new interfaces and extend PlayResponse in game-api.ts**

Replace the contents of `packages/bff-contracts/src/game-api.ts` with:

```typescript
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
```

- [ ] **Step 2: Export new types from index.ts**

Replace the contents of `packages/bff-contracts/src/index.ts` with:

```typescript
export type {
  InitRequest,
  InitResponse,
  PlayRequest,
  PlayResponse,
  TaskUpdate,
  Task,
  TaskWithProgress,
  ClaimRequest,
  ClaimResponse,
  ResultRecord,
  ResultResponse,
  ErrorResponse,
} from './game-api.js'
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd /Users/admin/Desktop/paly-sdd
pnpm --filter @paly-sdd/bff-contracts exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/bff-contracts/src/game-api.ts packages/bff-contracts/src/index.ts
git commit -m "feat(bff-contracts): add task system types"
```

---

## Task 2: Create DB tables for task system

**Files:**
- Modify: `apps/service/src/db.ts`

- [ ] **Step 1: Add CREATE TABLE statements to initDb()**

In `apps/service/src/db.ts`, add to the `db.exec(...)` string after the `user_plays` table:

```typescript
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('once','cumulative')),
      target_count INTEGER NOT NULL DEFAULT 1,
      trigger TEXT NOT NULL CHECK(trigger IN ('play','win')),
      prize_id TEXT NOT NULL REFERENCES prizes(id),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_task_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      campaign_id TEXT NOT NULL,
      current_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK(status IN ('in_progress','completed','claimed')),
      completed_at TEXT,
      claimed_at TEXT,
      UNIQUE(user_id, task_id)
    );
```

The full `db.exec` call should now look like:

```typescript
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game_id TEXT NOT NULL,
      max_plays INTEGER NOT NULL DEFAULT 3,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('virtual','physical','coupon')),
      weight INTEGER NOT NULL DEFAULT 1,
      stock INTEGER NOT NULL DEFAULT -1
    );

    CREATE TABLE IF NOT EXISTS user_plays (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      prize_id TEXT,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('once','cumulative')),
      target_count INTEGER NOT NULL DEFAULT 1,
      trigger TEXT NOT NULL CHECK(trigger IN ('play','win')),
      prize_id TEXT NOT NULL REFERENCES prizes(id),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_task_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      campaign_id TEXT NOT NULL,
      current_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK(status IN ('in_progress','completed','claimed')),
      completed_at TEXT,
      claimed_at TEXT,
      UNIQUE(user_id, task_id)
    );
  `)
```

- [ ] **Step 2: Verify the existing db.test.ts still passes**

```bash
cd /Users/admin/Desktop/paly-sdd
pnpm --filter @paly-sdd/service test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/service/src/db.ts
git commit -m "feat(service): add tasks and user_task_progress tables"
```

---

## Task 3: Add issuePrizeById to prizes module

**Files:**
- Modify: `apps/service/src/prizes/index.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/service/src/prizes/prizes.test.ts`:

```typescript
import { issuePrizeById } from './index.js'

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @paly-sdd/service test
```

Expected: FAIL — `issuePrizeById` not defined.

- [ ] **Step 3: Implement issuePrizeById in prizes/index.ts**

Add to the bottom of `apps/service/src/prizes/index.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @paly-sdd/service test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/service/src/prizes/index.ts apps/service/src/prizes/prizes.test.ts
git commit -m "feat(service): add issuePrizeById to prizes module"
```

---

## Task 4: Create task helpers module

**Files:**
- Create: `apps/service/src/tasks/index.ts`
- Create: `apps/service/src/tasks/tasks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/service/src/tasks/tasks.test.ts`:

```typescript
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
    expect(() => claimTask('u1', 't-once', 'c1')).toThrow()
    try {
      claimTask('u1', 't-once', 'c1')
    } catch (err: unknown) {
      expect((err as { statusCode: number }).statusCode).toBe(409)
    }
  })

  it('throws 409 when task is already claimed', () => {
    updateTaskProgress('u1', 'c1', 'play')
    claimTask('u1', 't-once', 'c1')
    expect(() => claimTask('u1', 't-once', 'c1')).toThrow()
    try {
      claimTask('u1', 't-once', 'c1')
    } catch (err: unknown) {
      expect((err as { statusCode: number }).statusCode).toBe(409)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @paly-sdd/service test
```

Expected: FAIL — `apps/service/src/tasks/index.ts` not found.

- [ ] **Step 3: Implement tasks/index.ts**

Create `apps/service/src/tasks/index.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @paly-sdd/service test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/service/src/tasks/index.ts apps/service/src/tasks/tasks.test.ts
git commit -m "feat(service): add task helpers module"
```

---

## Task 5: Seed demo tasks

**Files:**
- Modify: `apps/service/src/seed.ts`

- [ ] **Step 1: Refactor prize insertion to track IDs, then add task seeding**

Replace `apps/service/src/seed.ts` with the following (prize IDs are now captured in maps so tasks can reference them):

```typescript
import { randomUUID } from 'crypto'
import { getDb } from './db.js'

export function seedDemoData(): void {
  const db = getDb()!
  const existing = db.prepare("SELECT id FROM campaigns WHERE id LIKE 'demo-%'").get()
  if (existing) return  // already seeded

  const now = new Date().toISOString()
  const far = '2099-12-31T23:59:59Z'

  // ── grid9 campaign ──
  db.prepare(
    'INSERT INTO campaigns (id,name,game_id,max_plays,start_at,end_at,config,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run('demo-grid9', '九宫格活动Demo', 'grid9', 3, now, far, JSON.stringify({
    prizes: [
      { position: 0, label: '一等奖' },
      { position: 1, label: '二等奖' },
      { position: 2, label: '三等奖' },
      { position: 3, label: '谢谢参与' },
      { position: 4, label: '优惠券' },
      { position: 5, label: '谢谢参与' },
      { position: 6, label: '积分×10' },
      { position: 7, label: '谢谢参与' },
      { position: 8, label: '二等奖' },
    ]
  }), now)

  const grid9PrizeIds: Record<string, string> = {}
  for (const p of [
    { name: '一等奖 AirPods', type: 'physical', weight: 1, stock: 5 },
    { name: '二等奖 优惠券50元', type: 'coupon', weight: 5, stock: -1 },
    { name: '三等奖 积分×10', type: 'virtual', weight: 10, stock: -1 },
    { name: '谢谢参与', type: 'virtual', weight: 30, stock: -1 },
  ]) {
    const id = randomUUID()
    grid9PrizeIds[p.name] = id
    db.prepare('INSERT INTO prizes (id,campaign_id,name,type,weight,stock) VALUES (?,?,?,?,?,?)')
      .run(id, 'demo-grid9', p.name, p.type, p.weight, p.stock)
  }

  // ── spin-wheel campaign ──
  db.prepare(
    'INSERT INTO campaigns (id,name,game_id,max_plays,start_at,end_at,config,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run('demo-spin-wheel', '转盘活动Demo', 'spin-wheel', 3, now, far, JSON.stringify({
    sectors: [
      { label: '一等奖', color: '#FF6B6B' },
      { label: '优惠券', color: '#4ECDC4' },
      { label: '谢谢参与', color: '#95E1D3' },
      { label: '积分', color: '#F8B400' },
      { label: '二等奖', color: '#A8D8EA' },
      { label: '谢谢参与', color: '#AA96DA' },
    ]
  }), now)

  const spinPrizeIds: Record<string, string> = {}
  for (const p of [
    { name: '一等奖 手机', type: 'physical', weight: 1, stock: 2 },
    { name: '优惠券20元', type: 'coupon', weight: 8, stock: -1 },
    { name: '积分×5', type: 'virtual', weight: 15, stock: -1 },
    { name: '谢谢参与', type: 'virtual', weight: 40, stock: -1 },
  ]) {
    const id = randomUUID()
    spinPrizeIds[p.name] = id
    db.prepare('INSERT INTO prizes (id,campaign_id,name,type,weight,stock) VALUES (?,?,?,?,?,?)')
      .run(id, 'demo-spin-wheel', p.name, p.type, p.weight, p.stock)
  }

  // ── blind-box campaign ──
  db.prepare(
    'INSERT INTO campaigns (id,name,game_id,max_plays,start_at,end_at,config,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run('demo-blind-box', '盲盒活动Demo', 'blind-box', 3, now, far, JSON.stringify({
    boxTheme: 'default'
  }), now)

  const boxPrizeIds: Record<string, string> = {}
  for (const p of [
    { name: '限定周边', type: 'physical', weight: 2, stock: 10 },
    { name: '优惠券30元', type: 'coupon', weight: 8, stock: -1 },
    { name: '积分×20', type: 'virtual', weight: 20, stock: -1 },
    { name: '谢谢参与', type: 'virtual', weight: 35, stock: -1 },
  ]) {
    const id = randomUUID()
    boxPrizeIds[p.name] = id
    db.prepare('INSERT INTO prizes (id,campaign_id,name,type,weight,stock) VALUES (?,?,?,?,?,?)')
      .run(id, 'demo-blind-box', p.name, p.type, p.weight, p.stock)
  }

  // ── tasks ──
  const taskSql = `INSERT INTO tasks (id,campaign_id,title,description,type,target_count,trigger,prize_id,sort_order) VALUES (?,?,?,?,?,?,?,?,?)`

  // grid9 tasks
  db.prepare(taskSql).run('task-grid9-first-play','demo-grid9','首次游玩','首次体验九宫格即可领奖','once',1,'play',grid9PrizeIds['三等奖 积分×10'],1)
  db.prepare(taskSql).run('task-grid9-three-plays','demo-grid9','累计3次游玩','累计游玩3次解锁大奖','cumulative',3,'play',grid9PrizeIds['二等奖 优惠券50元'],2)

  // spin-wheel tasks
  db.prepare(taskSql).run('task-spin-first-play','demo-spin-wheel','首次转盘','首次体验转盘即可领奖','once',1,'play',spinPrizeIds['积分×5'],1)
  db.prepare(taskSql).run('task-spin-first-win','demo-spin-wheel','赢得奖品','首次赢得奖品','once',1,'win',spinPrizeIds['优惠券20元'],2)

  // blind-box tasks
  db.prepare(taskSql).run('task-box-first-play','demo-blind-box','开启盲盒','首次开启盲盒即可领奖','once',1,'play',boxPrizeIds['积分×20'],1)
  db.prepare(taskSql).run('task-box-three-plays','demo-blind-box','累计3次开箱','累计开启3次盲盒','cumulative',3,'play',boxPrizeIds['优惠券30元'],2)
}
```

- [ ] **Step 2: Run all service tests**

```bash
pnpm --filter @paly-sdd/service test
```

Expected: all tests pass (seed.ts has no direct tests; existing tests use in-memory DB).

- [ ] **Step 3: Commit**

```bash
git add apps/service/src/seed.ts
git commit -m "feat(service): seed demo tasks for all 3 campaigns"
```

---

## Task 6: Extend Service routes

**Files:**
- Modify: `apps/service/src/routes/game.ts`

- [ ] **Step 1: Update imports and play handler; add task routes**

Replace the contents of `apps/service/src/routes/game.ts` with:

```typescript
import type { FastifyInstance } from 'fastify'
import type { Prize } from '@paly-sdd/game-core'
import { getDb } from '../db.js'
import { getCampaign, getConfig } from '../campaigns/index.js'
import { drawPrize, getPrizeById } from '../prizes/index.js'
import { getRemainingPlays, recordPlay, getPlayHistory } from '../users/index.js'
import {
  getTasksWithProgress,
  updateTaskProgress,
  claimTask,
  type TaskUpdate,
} from '../tasks/index.js'

export async function gameRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/internal/game/:gameId/init
  app.post<{ Params: { gameId: string }; Body: { userId: string; campaignId: string } }>(
    '/api/internal/game/:gameId/init',
    async (req, reply) => {
      const { userId, campaignId } = req.body
      const campaign = getCampaign(campaignId)
      if (!campaign) return reply.status(404).send({ error: 'campaign not found' })

      const config = getConfig(campaignId)
      const remainingPlays = getRemainingPlays(userId, campaignId)
      return reply.send({ config, remainingPlays })
    }
  )

  // POST /api/internal/game/:gameId/play
  app.post<{ Params: { gameId: string }; Body: { userId: string; campaignId: string } }>(
    '/api/internal/game/:gameId/play',
    async (req, reply) => {
      const { userId, campaignId } = req.body
      const { gameId } = req.params
      const db = getDb()

      type CoreResult = { prize: Prize | null; remainingPlays: number } | { error: string }

      const core = db.transaction((): CoreResult => {
        const remaining = getRemainingPlays(userId, campaignId)
        if (remaining <= 0) return { error: 'no plays remaining' }
        const prize = drawPrize(campaignId)
        recordPlay(userId, campaignId, gameId, prize?.id ?? null)
        return { prize, remainingPlays: getRemainingPlays(userId, campaignId) }
      })()

      if ('error' in core) return reply.status(403).send(core)

      // Update task progress outside the play transaction so failures don't affect play result
      let taskUpdates: TaskUpdate[] = []
      try {
        taskUpdates = updateTaskProgress(userId, campaignId, 'play')
        if (core.prize !== null) {
          const winUpdates = updateTaskProgress(userId, campaignId, 'win')
          taskUpdates = [...taskUpdates, ...winUpdates]
        }
      } catch (err) {
        app.log.error(err, 'task progress update failed')
      }

      return reply.send({ ...core, taskUpdates })
    }
  )

  // GET /api/internal/game/:gameId/result
  app.get<{ Params: { gameId: string }; Querystring: { userId: string; campaignId: string } }>(
    '/api/internal/game/:gameId/result',
    async (req, reply) => {
      const { userId, campaignId } = req.query
      const history = getPlayHistory(userId, campaignId)
      const records = history
        .filter((h) => h.prize_id !== null)
        .map((h) => ({
          prize: getPrizeById(h.prize_id!)!,
          playedAt: h.played_at,
        }))
      return reply.send({ records })
    }
  )

  // GET /api/internal/tasks
  app.get<{ Querystring: { userId: string; campaignId: string } }>(
    '/api/internal/tasks',
    async (req, reply) => {
      const { userId, campaignId } = req.query
      const tasks = getTasksWithProgress(userId, campaignId)
      return reply.send(tasks)
    }
  )

  // POST /api/internal/tasks/:taskId/claim
  app.post<{ Params: { taskId: string }; Body: { userId: string; campaignId: string } }>(
    '/api/internal/tasks/:taskId/claim',
    async (req, reply) => {
      const { taskId } = req.params
      const { userId, campaignId } = req.body
      try {
        const prize = claimTask(userId, taskId, campaignId)
        return reply.send({ prize })
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message: string }
        return reply.status(e.statusCode ?? 500).send({ error: e.message })
      }
    }
  )
}
```

- [ ] **Step 2: Run all service tests**

```bash
pnpm --filter @paly-sdd/service test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/service/src/routes/game.ts
git commit -m "feat(service): extend play handler and add task routes"
```

---

## Task 7: Add BFF proxy routes for tasks

**Files:**
- Create: `apps/bff/src/routes/game/tasks.ts`
- Modify: `apps/bff/src/server.ts`

- [ ] **Step 1: Create BFF task proxy routes**

Create `apps/bff/src/routes/game/tasks.ts`:

```typescript
import type { FastifyInstance } from 'fastify'
import { fetch } from 'undici'

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:3001'

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { campaignId: string } }>(
    '/api/game/tasks',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const serviceUrl = new URL(`${SERVICE_URL}/api/internal/tasks`)
      serviceUrl.searchParams.set('userId', userId)
      serviceUrl.searchParams.set('campaignId', req.query.campaignId)
      const res = await fetch(serviceUrl.toString())
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )

  app.post<{ Params: { taskId: string }; Body: { campaignId: string } }>(
    '/api/game/tasks/:taskId/claim',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(
        `${SERVICE_URL}/api/internal/tasks/${req.params.taskId}/claim`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
        }
      )
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )
}
```

- [ ] **Step 2: Register taskRoutes in server.ts**

In `apps/bff/src/server.ts`, add the import and register call:

```typescript
import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { authMiddleware } from './middleware/auth.js'
import { grid9Routes } from './routes/game/grid9.js'
import { spinWheelRoutes } from './routes/game/spin-wheel.js'
import { blindBoxRoutes } from './routes/game/blind-box.js'
import { taskRoutes } from './routes/game/tasks.js'

const app = Fastify({ logger: true })

app.setErrorHandler(async (error, _req, reply) => {
  reply.status(503).send({ error: 'Service unavailable' })
})

// rate limit: 5 play requests per second per user
await app.register(rateLimit, {
  max: 5,
  timeWindow: '1 second',
  keyGenerator: (req) => (req.headers['x-user-token'] as string) ?? req.ip,
  skipOnError: false,
})

app.addHook('onRequest', authMiddleware)

await app.register(grid9Routes)
await app.register(spinWheelRoutes)
await app.register(blindBoxRoutes)
await app.register(taskRoutes)

const port = Number(process.env.PORT ?? 3000)
await app.listen({ port, host: '0.0.0.0' })
```

- [ ] **Step 3: Verify BFF TypeScript compiles**

```bash
pnpm --filter @paly-sdd/bff exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/bff/src/routes/game/tasks.ts apps/bff/src/server.ts
git commit -m "feat(bff): add task proxy routes"
```

---

## Task 8: Build TaskList frontend component

**Files:**
- Create: `apps/web/src/pages/DemoCampaign/TaskList.tsx`
- Create: `apps/web/src/pages/DemoCampaign/TaskList.css`
- Create: `apps/web/src/pages/DemoCampaign/TaskList.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/pages/DemoCampaign/TaskList.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TaskList from './TaskList.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

const inProgressTask = {
  id: 't1', title: '首次游玩', description: '游玩一次',
  type: 'once', targetCount: 1, trigger: 'play', prizeId: 'p1',
  currentCount: 0, status: 'in_progress',
}
const completedTask = {
  id: 't2', title: '累计3次', description: '游玩3次',
  type: 'cumulative', targetCount: 3, trigger: 'play', prizeId: 'p1',
  currentCount: 3, status: 'completed',
}
const claimedTask = {
  id: 't3', title: '赢得奖品', description: '赢一次',
  type: 'once', targetCount: 1, trigger: 'win', prizeId: 'p2',
  currentCount: 1, status: 'claimed',
}

const defaultProps = {
  campaignId: 'demo-grid9',
  playCount: 0,
  onClaimed: vi.fn(),
}

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [inProgressTask, completedTask, claimedTask],
  })
})

describe('TaskList', () => {
  it('renders task titles', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('首次游玩')).toBeInTheDocument()
      expect(screen.getByText('累计3次')).toBeInTheDocument()
    })
  })

  it('shows Claim button only for completed tasks', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '领取奖励' })).toBeInTheDocument()
    })
    // in_progress task has no button
    expect(screen.queryAllByRole('button', { name: '领取奖励' })).toHaveLength(1)
  })

  it('shows claimed label for claimed tasks', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/已领取/)).toBeInTheDocument()
    })
  })

  it('renders progress bar width correctly for cumulative task', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => screen.getByText('累计3次'))
    const fills = document.querySelectorAll('.task-progress-fill')
    // completedTask: 3/3 = 100%, inProgressTask: 0/1 = 0%
    const widths = Array.from(fills).map((el) => (el as HTMLElement).style.width)
    expect(widths).toContain('0%')
    expect(widths).toContain('100%')
  })

  it('re-fetches when playCount changes', async () => {
    const { rerender } = render(<TaskList {...defaultProps} playCount={0} />)
    await waitFor(() => screen.getByText('首次游玩'))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    rerender(<TaskList {...defaultProps} playCount={1} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('calls onClaimed after successful claim', async () => {
    const onClaimed = vi.fn()
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [completedTask] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ prize: { id: 'p1', name: '积分×10', type: 'virtual' } }) })

    render(<TaskList {...defaultProps} onClaimed={onClaimed} />)
    await waitFor(() => screen.getByRole('button', { name: '领取奖励' }))
    fireEvent.click(screen.getByRole('button', { name: '领取奖励' }))
    await waitFor(() => expect(onClaimed).toHaveBeenCalledWith('积分×10'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @paly-sdd/web test
```

Expected: FAIL — `TaskList` not found.

- [ ] **Step 3: Create TaskList.tsx**

Create `apps/web/src/pages/DemoCampaign/TaskList.tsx`:

```typescript
import { useState, useEffect } from 'react'
import './TaskList.css'

interface TaskWithProgress {
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

interface TaskListProps {
  campaignId: string
  playCount: number
  onClaimed: (prizeName: string) => void
}

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem('user-token', token)
  }
  return token
}

export default function TaskList({ campaignId, playCount, onClaimed }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskWithProgress[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/game/tasks?campaignId=${campaignId}`, {
      headers: { 'x-user-token': getUserToken() },
    })
      .then((r) => r.json())
      .then((data: TaskWithProgress[]) => setTasks(data))
  }, [campaignId, playCount])

  async function handleClaim(taskId: string) {
    if (claiming) return
    setClaiming(taskId)
    const res = await fetch(`/api/game/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    if (res.ok) {
      const data = await res.json()
      onClaimed(data.prize.name)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'claimed' as const } : t))
      )
    }
    setClaiming(null)
  }

  if (tasks.length === 0) return null

  return (
    <div className="task-list">
      <h3 className="task-list-title">活动任务</h3>
      {tasks.map((task) => (
        <div key={task.id} className={`task-card task-card--${task.status}`}>
          <div className="task-info">
            <span className="task-title">{task.title}</span>
            <span className="task-desc">{task.description}</span>
          </div>
          <div className="task-progress">
            <div className="task-progress-bar">
              <div
                className="task-progress-fill"
                style={{
                  width: `${Math.min(100, (task.currentCount / task.targetCount) * 100)}%`,
                }}
              />
            </div>
            <span className="task-progress-text">
              {task.currentCount}/{task.targetCount}
            </span>
          </div>
          {task.status === 'completed' && (
            <button
              className="task-claim-btn"
              onClick={() => handleClaim(task.id)}
              disabled={claiming === task.id}
            >
              领取奖励
            </button>
          )}
          {task.status === 'claimed' && (
            <span className="task-claimed-label">已领取 ✓</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create TaskList.css**

Create `apps/web/src/pages/DemoCampaign/TaskList.css`:

```css
.task-list {
  padding: 16px;
  margin: 0 auto;
  max-width: 480px;
}

.task-list-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 12px;
}

.task-card {
  background: var(--color-surface);
  border-radius: var(--border-radius-card);
  padding: 12px 14px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-card--claimed {
  opacity: 0.6;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.task-desc {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.task-progress-text {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
  white-space: nowrap;
}

.task-claim-btn {
  align-self: flex-start;
  padding: 6px 16px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.task-claim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-claimed-label {
  font-size: 0.8rem;
  color: var(--color-success);
  font-weight: 600;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @paly-sdd/web test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/DemoCampaign/TaskList.tsx \
        apps/web/src/pages/DemoCampaign/TaskList.css \
        apps/web/src/pages/DemoCampaign/TaskList.test.tsx
git commit -m "feat(web): add TaskList component"
```

---

## Task 9: Wire TaskList into DemoCampaign

**Files:**
- Modify: `apps/web/src/pages/DemoCampaign/index.tsx`
- Modify: `apps/web/src/pages/DemoCampaign/DemoCampaign.test.tsx`

- [ ] **Step 1: Update DemoCampaign to mount TaskList**

Replace the contents of `apps/web/src/pages/DemoCampaign/index.tsx` with:

```typescript
import { useState, useRef } from 'react'
import { getGame } from '@paly-sdd/game-core'
import type { Prize } from '@paly-sdd/game-core'
import GameTabs from './GameTabs.tsx'
import PrizeHistory, { type PrizeHistoryRef } from './PrizeHistory.tsx'
import TaskList from './TaskList.tsx'
import './DemoCampaign.css'

const GAME_TABS = [
  { id: 'grid9', label: '九宫格', campaignId: 'demo-grid9' },
  { id: 'spin-wheel', label: '转盘', campaignId: 'demo-spin-wheel' },
  { id: 'blind-box', label: '盲盒', campaignId: 'demo-blind-box' },
]

export default function DemoCampaign() {
  const [activeGameId, setActiveGameId] = useState('grid9')
  const [playCount, setPlayCount] = useState(0)
  const historyRef = useRef<PrizeHistoryRef>(null)

  const activeTab = GAME_TABS.find((t) => t.id === activeGameId)!
  const plugin = getGame(activeGameId)
  const GameComponent = plugin?.component

  function handleResult(_prize: Prize | null) {
    historyRef.current?.refresh()
    setPlayCount((c) => c + 1)
  }

  return (
    <div className="skin-default demo-page">
      {/* Banner */}
      <div className="demo-banner">
        <div className="demo-banner-text">
          <h1>限时活动</h1>
          <p>多种玩法，好礼等你拿</p>
        </div>
      </div>

      {/* Game Tabs */}
      <GameTabs
        tabs={GAME_TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeGameId}
        onChange={(id) => setActiveGameId(id)}
      />

      {/* Game Area */}
      <div className="demo-game-area">
        {GameComponent ? (
          <GameComponent
            campaignId={activeTab.campaignId}
            maxPlays={3}
            onResult={handleResult}
          />
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>游戏加载中...</p>
        )}
      </div>

      {/* Task List */}
      <TaskList
        campaignId={activeTab.campaignId}
        playCount={playCount}
        onClaimed={() => {}}
      />

      {/* Prize History */}
      <PrizeHistory
        ref={historyRef}
        gameId={activeGameId}
        campaignId={activeTab.campaignId}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update DemoCampaign.test.tsx to handle TaskList's fetch call**

Replace the contents of `apps/web/src/pages/DemoCampaign/DemoCampaign.test.tsx` with:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerGame } from '@paly-sdd/game-core'
import { clearRegistry } from '@paly-sdd/game-core/registry'
import type { GamePlugin } from '@paly-sdd/game-core'
import DemoCampaign from './index.tsx'
import { createElement } from 'react'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockPlugin = (id: string): GamePlugin => ({
  id,
  component: () => createElement('div', { 'data-testid': `game-${id}` }, id),
  bffRoutes: [],
})

beforeEach(() => {
  clearRegistry()
  registerGame(mockPlugin('grid9'))
  registerGame(mockPlugin('spin-wheel'))
  registerGame(mockPlugin('blind-box'))
  // handles both PrizeHistory and TaskList fetch calls
  mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
})

describe('DemoCampaign', () => {
  it('renders three tabs', () => {
    render(<DemoCampaign />)
    expect(screen.getByText('九宫格')).toBeInTheDocument()
    expect(screen.getByText('转盘')).toBeInTheDocument()
    expect(screen.getByText('盲盒')).toBeInTheDocument()
  })

  it('shows grid9 game by default', () => {
    render(<DemoCampaign />)
    expect(screen.getByTestId('game-grid9')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run all web tests**

```bash
pnpm --filter @paly-sdd/web test
```

Expected: all tests pass.

- [ ] **Step 4: Run all tests across the entire monorepo**

```bash
cd /Users/admin/Desktop/paly-sdd && pnpm test
```

Expected: all test suites pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/DemoCampaign/index.tsx \
        apps/web/src/pages/DemoCampaign/DemoCampaign.test.tsx
git commit -m "feat(web): wire TaskList into DemoCampaign page"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ `tasks` + `user_task_progress` tables — Task 2
  - ✅ `once` and `cumulative` task types — tasks/index.ts `updateTaskProgress`
  - ✅ `play` and `win` triggers — Task 4 + Task 6
  - ✅ Backend validation of progress — tasks/index.ts, Service routes
  - ✅ Prize issued on claim via `issuePrizeById` — Task 3 + Task 4
  - ✅ `GET /game/tasks` + `POST /game/tasks/:id/claim` BFF routes — Task 7
  - ✅ `taskUpdates[]` in PlayResponse — Task 1 + Task 6
  - ✅ 409 on double-claim — `claimTask` status check + test in Task 4
  - ✅ Task progress failure does not fail play — try/catch in Task 6
  - ✅ TaskList component with progress bar + Claim button + Claimed label — Task 8
  - ✅ Re-fetch after play via `playCount` prop — Task 8 + Task 9
  - ✅ Demo seed data for all 3 campaigns — Task 5

- **Type consistency:** `TaskUpdate` defined in game-api.ts (Task 1), exported from bff-contracts, used in PlayResponse; mirrored locally in tasks/index.ts for service layer. `TaskWithProgress` shape in tasks/index.ts matches the bff-contracts definition. ✅

- **No placeholders:** All steps contain complete code. ✅
