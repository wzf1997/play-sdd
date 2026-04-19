# Task System Design

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Player task system for the paly-sdd game landing framework

---

## Overview

Add a player-facing task system to the game landing framework. Players complete in-game actions to progress toward task goals and claim prizes on completion. Task progress is validated server-side; rewards reuse the existing Prize system.

---

## Architecture

Approach: embed task progress tracking inside the existing `/play` call chain. No new event bus or separate trigger system — the Service layer checks and updates task progress synchronously after recording each play result.

Affected layers:
- `packages/bff-contracts` — new type definitions
- `apps/service` — new DB tables, new routes, play route extended
- `apps/bff` — new proxy routes
- `apps/web` — new `TaskList` component in DemoCampaign page

---

## Data Model

Two new SQLite tables in `apps/service`.

### `tasks`

Seeded per campaign by ops. Defines what tasks exist and what reward they grant.

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | unique task identifier |
| `campaign_id` | TEXT | which campaign this belongs to |
| `title` | TEXT | displayed to player, e.g. "First Play" |
| `description` | TEXT | short task description |
| `type` | TEXT | `once` or `cumulative` |
| `target_count` | INTEGER | goal count; always `1` for `once` type |
| `trigger` | TEXT | `play` (any play) or `win` (play that yields a prize) |
| `prize_id` | TEXT FK | prize issued on task completion |
| `sort_order` | INTEGER | display order on frontend |

### `user_task_progress`

One row per (user, task). Created lazily on first qualifying play.

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `user_id` | TEXT | |
| `task_id` | TEXT FK | |
| `campaign_id` | TEXT | |
| `current_count` | INTEGER | progress toward `target_count` |
| `status` | TEXT | `in_progress` / `completed` / `claimed` |
| `completed_at` | TEXT | ISO timestamp, nullable |
| `claimed_at` | TEXT | ISO timestamp, nullable |

---

## API Design

### New contracts — `packages/bff-contracts/src/index.ts`

```typescript
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

export interface TaskUpdate {
  taskId: string
  previousCount: number
  currentCount: number
  completed: boolean
}

export interface ClaimRequest {
  userId: string
  campaignId: string
}

export interface ClaimResponse {
  prize: Prize
}
```

### Extended contract — `PlayResponse`

```typescript
export interface PlayResponse {
  prize: Prize | null
  remainingPlays: number
  taskUpdates: TaskUpdate[]   // new field; empty array when no tasks progress
}
```

### New Service routes (port 3001)

```
GET  /game/tasks?userId=&campaignId=    → TaskWithProgress[]
POST /game/tasks/:taskId/claim          → ClaimResponse
```

### New BFF routes (port 3000)

New file `apps/bff/src/routes/game/tasks.ts`:

```
GET  /game/tasks?userId=&campaignId=    → proxies to Service GET /game/tasks
POST /game/tasks/:taskId/claim          → proxies to Service POST /game/tasks/:taskId/claim
```

Both routes go through the existing auth middleware.

---

## Data Flow

### Play triggers task progress

```
1. Frontend  →  BFF  POST /game/play  { userId, campaignId }
2. BFF       →  Service  POST /game/play
3. Service:
     a. Record play result (existing logic)
     b. Determine trigger: prize!=null → matches 'win'; always matches 'play'
     c. For each task in campaign where trigger matches and status != 'claimed':
          - Upsert user_task_progress, increment current_count
          - If current_count >= target_count: set status='completed', completed_at=now
     d. Build taskUpdates[] from changed rows
4. Service  →  BFF  →  Frontend: PlayResponse { prize, remainingPlays, taskUpdates }
5. Frontend animates progress bar(s) from taskUpdates
```

### Player claims a completed task

```
1. Frontend  →  BFF  POST /game/tasks/:taskId/claim  { userId, campaignId }
2. BFF       →  Service
3. Service:
     a. Verify status='completed' for this user+task (guard against double-claim)
     b. Issue prize using existing prize logic
     c. Set status='claimed', claimed_at=now
4. Returns ClaimResponse { prize }
5. Frontend shows prize result modal (reuses existing result UI)
```

---

## Frontend Changes

### New component: `TaskList`

Location: `apps/web/src/pages/DemoCampaign/TaskList.tsx`

Placed below `GameTabs` in the `DemoCampaign` page layout.

```
DemoCampaign
  ├── GameTabs          (existing)
  ├── TaskList          (new)
  │   └── TaskCard × N
  │       ├── title + description
  │       ├── progress bar  (currentCount / targetCount)
  │       ├── "Claim" button  (visible when status='completed')
  │       └── "Claimed ✓" label  (when status='claimed')
  └── PrizeHistory      (existing)
```

Behavior:
- Fetches `GET /game/tasks` on mount.
- After each play, merges `taskUpdates` from `PlayResponse` into local state and animates the progress bars — no additional polling.
- Claim button calls `POST /game/tasks/:taskId/claim` and opens the existing prize result modal on success.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Double-claim attempt | Service returns 409; frontend disables Claim button after first click |
| Task not found | Service returns 404; BFF passes through |
| Prize exhausted | Reuse existing prize-exhausted error path |
| Task progress update fails | Log error, do not fail the play response — play result takes priority |

---

## Testing

### Unit tests (Vitest)

- `TaskList` renders correct progress state for each status
- `TaskCard` shows Claim button only when `status='completed'`
- `TaskCard` shows Claimed label when `status='claimed'`
- Progress bar renders correct width for cumulative tasks

### Service integration tests

- Play with `trigger='play'` increments matching tasks
- Play with no prize does not increment `trigger='win'` tasks
- `current_count` reaching `target_count` sets `status='completed'`
- Claim issues prize and sets `status='claimed'`
- Second claim on same task returns 409

---

## Files Changed

| File | Change |
|---|---|
| `packages/bff-contracts/src/index.ts` | Add `Task`, `TaskWithProgress`, `TaskUpdate`, `ClaimRequest`, `ClaimResponse`; extend `PlayResponse` |
| `apps/service/src/db.ts` | Create `tasks` and `user_task_progress` tables |
| `apps/service/src/seed.ts` | Add sample tasks for demo campaign |
| `apps/service/src/routes/game.ts` | Extend play handler; add task list and claim routes |
| `apps/bff/src/routes/game/tasks.ts` | New file — proxy routes for tasks |
| `apps/bff/src/server.ts` | Register new task routes |
| `apps/web/src/pages/DemoCampaign/TaskList.tsx` | New component |
| `apps/web/src/pages/DemoCampaign/TaskList.css` | New styles |
| `apps/web/src/pages/DemoCampaign/index.tsx` | Mount `TaskList` below `GameTabs` |
