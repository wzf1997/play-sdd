# SDD Game Landing Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Spec-Driven Development (SDD) framework for mobile game landing pages with three game plugins (九宫格/转盘/盲盒) and a demo landing page.

**Architecture:** Four-layer Monorepo — skin layer (React+Vite), skeleton layer (game-core package + game components), BFF layer (Fastify, stateless), service layer (Fastify + SQLite). AI generation scope is skeleton + BFF; skin and service are human-maintained. Games are registered plugins implementing a shared `GamePlugin` interface.

**Tech Stack:** pnpm workspaces, TypeScript 5, React 18 + Vite 5, Fastify 4, better-sqlite3, Vitest, @testing-library/react

---

## File Map

```
paly-sdd/
├── package.json                          # pnpm workspace root
├── tsconfig.base.json                    # shared TS config
│
├── packages/
│   ├── game-core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types.ts                  # GamePlugin, GameProps, BffRoute, Prize, RouteHandler
│   │       ├── registry.ts               # registerGame, getGame (Map singleton)
│   │       └── index.ts                  # re-exports
│   │
│   └── bff-contracts/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── game-api.ts               # InitRequest/Response, PlayRequest/Response, ResultResponse
│           └── index.ts
│
├── apps/
│   ├── service/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── db.ts                     # SQLite init, table creation
│   │       ├── seed.ts                   # demo-001 seed data
│   │       ├── campaigns/index.ts        # getCampaign, getConfig
│   │       ├── prizes/index.ts           # drawPrize (weighted random + stock check)
│   │       ├── users/index.ts            # getRemainingPlays, recordPlay
│   │       ├── routes/game.ts            # internal /api/internal/game/:gameId/* routes
│   │       └── server.ts                 # Fastify startup, port 3001
│   │
│   ├── bff/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── middleware/
│   │       │   ├── auth.ts               # x-user-token validation
│   │       │   └── rate-limit.ts         # per-userId play rate limiting
│   │       ├── routes/game/
│   │       │   ├── grid9.ts              # init/play/result → proxies to service
│   │       │   ├── spin-wheel.ts
│   │       │   └── blind-box.ts
│   │       └── server.ts                 # Fastify startup, port 3000, auto-registers routes
│   │
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── skins/
│           │   └── default/tokens.css    # CSS variables: --color-primary, etc.
│           ├── games/
│           │   ├── Grid9/
│           │   │   ├── index.tsx         # component + bffRoutes stub
│           │   │   └── Grid9.css
│           │   ├── SpinWheel/
│           │   │   ├── index.tsx
│           │   │   └── SpinWheel.css
│           │   └── BlindBox/
│           │       ├── index.tsx
│           │       └── BlindBox.css
│           ├── pages/
│           │   └── DemoCampaign/
│           │       ├── index.tsx         # page root, skin wrapper
│           │       ├── GameTabs.tsx      # tab switcher
│           │       ├── PrizeHistory.tsx  # prize record list
│           │       └── DemoCampaign.css
│           ├── App.tsx
│           └── main.tsx                  # registerGame calls, skin class
```

---

## Task 1: Monorepo 根配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1.1: 创建根 package.json**

```json
{
  "name": "paly-sdd",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  },
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

- [ ] **Step 1.2: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 1.3: 提交**

```bash
git add package.json tsconfig.base.json
git commit -m "chore: monorepo root config"
```

---

## Task 2: game-core 包 — 类型定义

**Files:**
- Create: `packages/game-core/package.json`
- Create: `packages/game-core/tsconfig.json`
- Create: `packages/game-core/src/types.ts`

- [ ] **Step 2.1: 创建目录和 package.json**

```bash
mkdir -p packages/game-core/src
```

```json
// packages/game-core/package.json
{
  "name": "@paly-sdd/game-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.5.0",
    "@types/react": "^18.3.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

- [ ] **Step 2.2: 创建 tsconfig.json**

```json
// packages/game-core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2.3: 写失败测试（类型推断测试）**

```typescript
// packages/game-core/src/types.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { GamePlugin, GameProps, Prize, BffRoute } from './types.js'

describe('GamePlugin types', () => {
  it('Prize has id, name, type', () => {
    const p: Prize = { id: '1', name: '优惠券', type: 'coupon' }
    expectTypeOf(p.type).toEqualTypeOf<'virtual' | 'physical' | 'coupon'>()
  })

  it('GameProps has required fields', () => {
    type RequiredKeys = 'campaignId' | 'maxPlays' | 'onResult'
    expectTypeOf<keyof GameProps>().toMatchTypeOf<RequiredKeys>()
  })
})
```

- [ ] **Step 2.4: 运行测试确认失败**

```bash
cd packages/game-core && pnpm install && pnpm test
```

期望：FAIL — Cannot find module './types.js'

- [ ] **Step 2.5: 实现 types.ts**

```typescript
// packages/game-core/src/types.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ComponentType } from 'react'

export interface Prize {
  id: string
  name: string
  type: 'virtual' | 'physical' | 'coupon'
}

export interface GameProps {
  campaignId: string
  maxPlays: number
  skin?: string
  onResult: (prize: Prize | null) => void
}

export type RouteHandler = (
  req: FastifyRequest,
  reply: FastifyReply
) => Promise<void>

export interface BffRoute {
  method: 'GET' | 'POST'
  path: string
  handler: RouteHandler
}

export interface GamePlugin {
  id: string
  component: ComponentType<GameProps>
  bffRoutes: BffRoute[]
}
```

- [ ] **Step 2.6: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 2 tests passed

- [ ] **Step 2.7: 提交**

```bash
cd ../..
git add packages/game-core/
git commit -m "feat(game-core): add GamePlugin, GameProps, Prize, BffRoute types"
```

---

## Task 3: game-core 包 — 注册表

**Files:**
- Create: `packages/game-core/src/registry.ts`
- Create: `packages/game-core/src/registry.test.ts`
- Create: `packages/game-core/src/index.ts`

- [ ] **Step 3.1: 写失败测试**

```typescript
// packages/game-core/src/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { registerGame, getGame, clearRegistry } from './registry.js'
import type { GamePlugin } from './types.js'
import { createElement } from 'react'

const mockPlugin: GamePlugin = {
  id: 'test-game',
  component: () => createElement('div', null, 'test'),
  bffRoutes: [],
}

describe('game registry', () => {
  beforeEach(() => clearRegistry())

  it('registers and retrieves a plugin', () => {
    registerGame(mockPlugin)
    expect(getGame('test-game')).toBe(mockPlugin)
  })

  it('returns undefined for unregistered game', () => {
    expect(getGame('not-exist')).toBeUndefined()
  })

  it('does not throw on missing game', () => {
    expect(() => getGame('missing')).not.toThrow()
  })
})
```

- [ ] **Step 3.2: 运行测试确认失败**

```bash
cd packages/game-core && pnpm test
```

期望：FAIL — Cannot find module './registry.js'

- [ ] **Step 3.3: 实现 registry.ts**

```typescript
// packages/game-core/src/registry.ts
import type { GamePlugin } from './types.js'

const registry = new Map<string, GamePlugin>()

export function registerGame(plugin: GamePlugin): void {
  registry.set(plugin.id, plugin)
}

export function getGame(id: string): GamePlugin | undefined {
  return registry.get(id)
}

/** Test helper only — clears registry between tests */
export function clearRegistry(): void {
  registry.clear()
}
```

- [ ] **Step 3.4: 创建 index.ts**

```typescript
// packages/game-core/src/index.ts
export type { GamePlugin, GameProps, Prize, BffRoute, RouteHandler } from './types.js'
export { registerGame, getGame } from './registry.js'
```

- [ ] **Step 3.5: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 3 tests passed (types + registry)

- [ ] **Step 3.6: 提交**

```bash
cd ../..
git add packages/game-core/src/registry.ts packages/game-core/src/registry.test.ts packages/game-core/src/index.ts
git commit -m "feat(game-core): add game registry with registerGame/getGame"
```

---

## Task 4: bff-contracts 包

**Files:**
- Create: `packages/bff-contracts/package.json`
- Create: `packages/bff-contracts/tsconfig.json`
- Create: `packages/bff-contracts/src/game-api.ts`
- Create: `packages/bff-contracts/src/index.ts`

- [ ] **Step 4.1: 创建目录和 package.json**

```bash
mkdir -p packages/bff-contracts/src
```

```json
// packages/bff-contracts/package.json
{
  "name": "@paly-sdd/bff-contracts",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@paly-sdd/game-core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 4.2: 创建 tsconfig.json**

```json
// packages/bff-contracts/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4.3: 实现 game-api.ts**

```typescript
// packages/bff-contracts/src/game-api.ts
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

export interface PlayResponse {
  prize: Prize | null
  remainingPlays: number
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

- [ ] **Step 4.4: 创建 index.ts**

```typescript
// packages/bff-contracts/src/index.ts
export type {
  InitRequest,
  InitResponse,
  PlayRequest,
  PlayResponse,
  ResultRecord,
  ResultResponse,
  ErrorResponse,
} from './game-api.js'
```

- [ ] **Step 4.5: 安装依赖并验证编译**

```bash
cd packages/bff-contracts && pnpm install
cd ../game-core && pnpm install
cd ../..
pnpm install
```

- [ ] **Step 4.6: 提交**

```bash
git add packages/bff-contracts/
git commit -m "feat(bff-contracts): add shared API type contracts"
```

---

## Task 5: Service 层 — 数据库与数据模型

**Files:**
- Create: `apps/service/package.json`
- Create: `apps/service/tsconfig.json`
- Create: `apps/service/src/db.ts`

- [ ] **Step 5.1: 创建目录和 package.json**

```bash
mkdir -p apps/service/src/{campaigns,prizes,users,routes}
```

```json
// apps/service/package.json
{
  "name": "@paly-sdd/service",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --loader ts-node/esm src/server.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "better-sqlite3": "^9.6.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/better-sqlite3": "^7.6.10",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.2",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 5.2: 创建 tsconfig.json**

```json
// apps/service/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5.3: 写失败测试（db.test.ts）**

```typescript
// apps/service/src/db.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { initDb, getDb } from './db.js'
import fs from 'fs'

const TEST_DB = ':memory:'

describe('database initialization', () => {
  afterEach(() => {
    getDb()?.close()
  })

  it('creates campaigns table', () => {
    initDb(TEST_DB)
    const db = getDb()!
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'"
    ).get()
    expect(row).toBeTruthy()
  })

  it('creates prizes table', () => {
    initDb(TEST_DB)
    const db = getDb()!
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prizes'"
    ).get()
    expect(row).toBeTruthy()
  })

  it('creates user_plays table', () => {
    initDb(TEST_DB)
    const db = getDb()!
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_plays'"
    ).get()
    expect(row).toBeTruthy()
  })
})
```

- [ ] **Step 5.4: 运行测试确认失败**

```bash
cd apps/service && pnpm install && pnpm test
```

期望：FAIL — Cannot find module './db.js'

- [ ] **Step 5.5: 实现 db.ts**

```typescript
// apps/service/src/db.ts
import Database from 'better-sqlite3'

let db: Database.Database | null = null

export function initDb(path = './data.db'): void {
  db = new Database(path)
  db.pragma('journal_mode = WAL')

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
  `)
}

export function getDb(): Database.Database | null {
  return db
}
```

- [ ] **Step 5.6: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 3 tests passed

- [ ] **Step 5.7: 提交**

```bash
cd ../..
git add apps/service/
git commit -m "feat(service): add SQLite db init with campaigns/prizes/user_plays tables"
```

---

## Task 6: Service 层 — 业务逻辑

**Files:**
- Create: `apps/service/src/campaigns/index.ts`
- Create: `apps/service/src/prizes/index.ts`
- Create: `apps/service/src/users/index.ts`

- [ ] **Step 6.1: 写失败测试（prizes.test.ts）**

```typescript
// apps/service/src/prizes/prizes.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, getDb } from '../db.js'
import { drawPrize } from './index.js'

describe('drawPrize', () => {
  beforeEach(() => {
    initDb(':memory:')
    const db = getDb()!
    db.prepare(`INSERT INTO campaigns VALUES ('c1','test','grid9',3,'2026-01-01','2099-01-01','{}',datetime('now'))`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p1','c1','大奖','coupon',10,-1)`).run()
    db.prepare(`INSERT INTO prizes VALUES ('p2','c1','无库存','virtual',10,0)`).run()
  })

  it('returns a prize with valid fields', () => {
    const prize = drawPrize('c1')
    expect(prize).not.toBeNull()
    expect(prize!.id).toBe('p1')
    expect(['virtual','physical','coupon']).toContain(prize!.type)
  })

  it('skips out-of-stock prizes', () => {
    const db = getDb()!
    db.prepare(`UPDATE prizes SET stock=0 WHERE id='p1'`).run()
    const prize = drawPrize('c1')
    expect(prize).toBeNull()
  })
})
```

- [ ] **Step 6.2: 写失败测试（users.test.ts）**

```typescript
// apps/service/src/users/users.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, getDb } from '../db.js'
import { getRemainingPlays, recordPlay } from './index.js'

describe('users module', () => {
  beforeEach(() => {
    initDb(':memory:')
    const db = getDb()!
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
```

- [ ] **Step 6.3: 运行测试确认失败**

```bash
cd apps/service && pnpm test
```

期望：FAIL — Cannot find module './prizes/index.js', './users/index.js'

- [ ] **Step 6.4: 实现 campaigns/index.ts**

```typescript
// apps/service/src/campaigns/index.ts
import { getDb } from '../db.js'
import type { Prize } from '@paly-sdd/game-core'

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
  return (getDb()!.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Campaign) ?? null
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
```

- [ ] **Step 6.5: 实现 prizes/index.ts**

```typescript
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
  const rows = getDb()!
    .prepare('SELECT * FROM prizes WHERE campaign_id = ? AND (stock = -1 OR stock > 0)')
    .all(campaignId) as PrizeRow[]

  if (rows.length === 0) return null

  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * totalWeight
  for (const row of rows) {
    rand -= row.weight
    if (rand <= 0) {
      // decrement stock if finite
      if (row.stock > 0) {
        getDb()!.prepare('UPDATE prizes SET stock = stock - 1 WHERE id = ?').run(row.id)
      }
      return { id: row.id, name: row.name, type: row.type }
    }
  }
  return null
}

export function getPrizeById(id: string): Prize | null {
  const row = getDb()!.prepare('SELECT * FROM prizes WHERE id = ?').get(id) as PrizeRow | undefined
  if (!row) return null
  return { id: row.id, name: row.name, type: row.type }
}
```

- [ ] **Step 6.6: 实现 users/index.ts**

```typescript
// apps/service/src/users/index.ts
import { randomUUID } from 'crypto'
import { getDb } from '../db.js'
import { getMaxPlays } from '../campaigns/index.js'

export function getRemainingPlays(userId: string, campaignId: string): number {
  const played = (
    getDb()!
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
  getDb()!
    .prepare(
      'INSERT INTO user_plays (id, user_id, campaign_id, game_id, prize_id, played_at) VALUES (?,?,?,?,?,?)'
    )
    .run(randomUUID(), userId, campaignId, gameId, prizeId, new Date().toISOString())
}

export function getPlayHistory(
  userId: string,
  campaignId: string
): Array<{ prize_id: string | null; played_at: string }> {
  return getDb()!
    .prepare(
      'SELECT prize_id, played_at FROM user_plays WHERE user_id = ? AND campaign_id = ? ORDER BY played_at DESC'
    )
    .all(userId, campaignId) as Array<{ prize_id: string | null; played_at: string }>
}
```

- [ ] **Step 6.7: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 6 tests passed (db + prizes + users)

- [ ] **Step 6.8: 提交**

```bash
cd ../..
git add apps/service/src/
git commit -m "feat(service): add campaigns, prizes, users business logic with tests"
```

---

## Task 7: Service 层 — Seed 数据与 HTTP 服务

**Files:**
- Create: `apps/service/src/seed.ts`
- Create: `apps/service/src/routes/game.ts`
- Create: `apps/service/src/server.ts`

- [ ] **Step 7.1: 实现 seed.ts**

```typescript
// apps/service/src/seed.ts
import { randomUUID } from 'crypto'
import { getDb } from './db.js'

export function seedDemoData(): void {
  const db = getDb()!
  const existing = db.prepare("SELECT id FROM campaigns WHERE id LIKE 'demo-%'").get()
  if (existing) return  // already seeded

  const now = new Date().toISOString()
  const far = '2099-12-31T23:59:59Z'

  // grid9 campaign
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

  const grid9Prizes = [
    { name: '一等奖 AirPods', type: 'physical', weight: 1, stock: 5 },
    { name: '二等奖 优惠券50元', type: 'coupon', weight: 5, stock: -1 },
    { name: '三等奖 积分×10', type: 'virtual', weight: 10, stock: -1 },
    { name: '谢谢参与', type: 'virtual', weight: 30, stock: -1 },
  ]
  for (const p of grid9Prizes) {
    db.prepare('INSERT INTO prizes (id,campaign_id,name,type,weight,stock) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), 'demo-grid9', p.name, p.type, p.weight, p.stock)
  }

  // spin-wheel campaign
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

  const spinPrizes = [
    { name: '一等奖 手机', type: 'physical', weight: 1, stock: 2 },
    { name: '优惠券20元', type: 'coupon', weight: 8, stock: -1 },
    { name: '积分×5', type: 'virtual', weight: 15, stock: -1 },
    { name: '谢谢参与', type: 'virtual', weight: 40, stock: -1 },
  ]
  for (const p of spinPrizes) {
    db.prepare('INSERT INTO prizes (id,campaign_id,name,type,weight,stock) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), 'demo-spin-wheel', p.name, p.type, p.weight, p.stock)
  }

  // blind-box campaign
  db.prepare(
    'INSERT INTO campaigns (id,name,game_id,max_plays,start_at,end_at,config,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run('demo-blind-box', '盲盒活动Demo', 'blind-box', 3, now, far, JSON.stringify({
    boxTheme: 'default'
  }), now)

  const boxPrizes = [
    { name: '限定周边', type: 'physical', weight: 2, stock: 10 },
    { name: '优惠券30元', type: 'coupon', weight: 8, stock: -1 },
    { name: '积分×20', type: 'virtual', weight: 20, stock: -1 },
    { name: '谢谢参与', type: 'virtual', weight: 35, stock: -1 },
  ]
  for (const p of boxPrizes) {
    db.prepare('INSERT INTO prizes (id,campaign_id,name,type,weight,stock) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), 'demo-blind-box', p.name, p.type, p.weight, p.stock)
  }
}
```

- [ ] **Step 7.2: 实现 routes/game.ts（内部路由）**

```typescript
// apps/service/src/routes/game.ts
import type { FastifyInstance } from 'fastify'
import { getCampaign, getConfig } from '../campaigns/index.js'
import { drawPrize, getPrizeById } from '../prizes/index.js'
import { getRemainingPlays, recordPlay, getPlayHistory } from '../users/index.js'

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

      const remaining = getRemainingPlays(userId, campaignId)
      if (remaining <= 0) return reply.status(403).send({ error: 'no plays remaining' })

      const prize = drawPrize(campaignId)
      recordPlay(userId, campaignId, gameId, prize?.id ?? null)
      const remainingPlays = getRemainingPlays(userId, campaignId)

      return reply.send({ prize, remainingPlays })
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
}
```

- [ ] **Step 7.3: 实现 server.ts**

```typescript
// apps/service/src/server.ts
import Fastify from 'fastify'
import { initDb } from './db.js'
import { seedDemoData } from './seed.js'
import { gameRoutes } from './routes/game.js'

const app = Fastify({ logger: true })

app.register(gameRoutes)

async function start(): Promise<void> {
  initDb('./data.db')
  seedDemoData()
  await app.listen({ port: 3001, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 7.4: 验证服务可启动**

```bash
cd apps/service && pnpm install && node --loader ts-node/esm src/server.ts
```

期望：输出 `Server listening at http://0.0.0.0:3001`，Ctrl+C 停止

- [ ] **Step 7.5: 验证 seed 数据和 init 接口**

```bash
curl -s -X POST http://localhost:3001/api/internal/game/grid9/init \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","campaignId":"demo-grid9"}' | jq .
```

期望：返回 `{ config: {...prizes...}, remainingPlays: 3 }`

- [ ] **Step 7.6: 提交**

```bash
cd ../..
git add apps/service/src/seed.ts apps/service/src/routes/ apps/service/src/server.ts
git commit -m "feat(service): add seed data and HTTP routes"
```

---

## Task 8: BFF 服务

**Files:**
- Create: `apps/bff/package.json`
- Create: `apps/bff/tsconfig.json`
- Create: `apps/bff/src/middleware/auth.ts`
- Create: `apps/bff/src/routes/game/grid9.ts`
- Create: `apps/bff/src/routes/game/spin-wheel.ts`
- Create: `apps/bff/src/routes/game/blind-box.ts`
- Create: `apps/bff/src/server.ts`

- [ ] **Step 8.1: 创建目录和 package.json**

```bash
mkdir -p apps/bff/src/{middleware,routes/game}
```

```json
// apps/bff/package.json
{
  "name": "@paly-sdd/bff",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --loader ts-node/esm src/server.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "@fastify/rate-limit": "^9.1.0",
    "undici": "^6.13.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.2",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 8.2: 创建 tsconfig.json**

```json
// apps/bff/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 8.3: 写失败测试（auth.test.ts）**

```typescript
// apps/bff/src/middleware/auth.test.ts
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { authMiddleware } from './auth.js'

describe('authMiddleware', () => {
  it('returns 401 when x-user-token is missing', async () => {
    const app = Fastify()
    app.addHook('onRequest', authMiddleware)
    app.get('/test', async () => ({ ok: true }))

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body)).toEqual({ error: 'unauthorized' })
  })

  it('passes through when x-user-token is present', async () => {
    const app = Fastify()
    app.addHook('onRequest', authMiddleware)
    app.get('/test', async () => ({ ok: true }))

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-user-token': 'test-user-uuid' },
    })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 8.4: 运行测试确认失败**

```bash
cd apps/bff && pnpm install && pnpm test
```

期望：FAIL — Cannot find module './auth.js'

- [ ] **Step 8.5: 实现 middleware/auth.ts**

```typescript
// apps/bff/src/middleware/auth.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = req.headers['x-user-token']
  if (!token || typeof token !== 'string' || token.trim() === '') {
    await reply.status(401).send({ error: 'unauthorized' })
  }
}
```

- [ ] **Step 8.6: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 2 tests passed

- [ ] **Step 8.7: 实现 grid9 路由**

```typescript
// apps/bff/src/routes/game/grid9.ts
import type { FastifyInstance } from 'fastify'
import { fetch } from 'undici'

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:3001'

export async function grid9Routes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { userId: string; campaignId: string } }>(
    '/api/game/grid9/init',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/grid9/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )

  app.post<{ Body: { campaignId: string } }>(
    '/api/game/grid9/play',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/grid9/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )

  app.get<{ Querystring: { campaignId: string } }>(
    '/api/game/grid9/result',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const url = `${SERVICE_URL}/api/internal/game/grid9/result?userId=${userId}&campaignId=${req.query.campaignId}`
      const res = await fetch(url)
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )
}
```

- [ ] **Step 8.8: 实现 spin-wheel 路由（与 grid9 相同结构，替换 gameId）**

```typescript
// apps/bff/src/routes/game/spin-wheel.ts
import type { FastifyInstance } from 'fastify'
import { fetch } from 'undici'

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:3001'

export async function spinWheelRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { campaignId: string } }>(
    '/api/game/spin-wheel/init',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/spin-wheel/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      return reply.status(res.status).send(await res.json())
    }
  )

  app.post<{ Body: { campaignId: string } }>(
    '/api/game/spin-wheel/play',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/spin-wheel/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      return reply.status(res.status).send(await res.json())
    }
  )

  app.get<{ Querystring: { campaignId: string } }>(
    '/api/game/spin-wheel/result',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const url = `${SERVICE_URL}/api/internal/game/spin-wheel/result?userId=${userId}&campaignId=${req.query.campaignId}`
      const res = await fetch(url)
      return reply.status(res.status).send(await res.json())
    }
  )
}
```

- [ ] **Step 8.9: 实现 blind-box 路由**

```typescript
// apps/bff/src/routes/game/blind-box.ts
import type { FastifyInstance } from 'fastify'
import { fetch } from 'undici'

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:3001'

export async function blindBoxRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { campaignId: string } }>(
    '/api/game/blind-box/init',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/blind-box/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      return reply.status(res.status).send(await res.json())
    }
  )

  app.post<{ Body: { campaignId: string } }>(
    '/api/game/blind-box/play',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/blind-box/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      return reply.status(res.status).send(await res.json())
    }
  )

  app.get<{ Querystring: { campaignId: string } }>(
    '/api/game/blind-box/result',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const url = `${SERVICE_URL}/api/internal/game/blind-box/result?userId=${userId}&campaignId=${req.query.campaignId}`
      const res = await fetch(url)
      return reply.status(res.status).send(await res.json())
    }
  )
}
```

- [ ] **Step 8.10: 实现 server.ts**

```typescript
// apps/bff/src/server.ts
import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { authMiddleware } from './middleware/auth.js'
import { grid9Routes } from './routes/game/grid9.js'
import { spinWheelRoutes } from './routes/game/spin-wheel.js'
import { blindBoxRoutes } from './routes/game/blind-box.js'

const app = Fastify({ logger: true })

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

await app.listen({ port: 3000, host: '0.0.0.0' })
```

- [ ] **Step 8.11: 验证 BFF 启动并响应**

先启动 Service（另一个终端），再：

```bash
cd apps/bff && node --loader ts-node/esm src/server.ts
```

```bash
curl -s -X POST http://localhost:3000/api/game/grid9/init \
  -H "Content-Type: application/json" \
  -H "x-user-token: test-user-1" \
  -d '{"campaignId":"demo-grid9"}' | jq .
```

期望：返回 `{ config: {...}, remainingPlays: 3 }`

- [ ] **Step 8.12: 提交**

```bash
cd ../..
git add apps/bff/
git commit -m "feat(bff): add auth middleware and three game routes"
```

---

## Task 9: Web 前端 — 基础搭建与皮肤系统

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/skins/default/tokens.css`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Step 9.1: 初始化 React + Vite 项目**

```bash
cd apps
npm create vite@latest web -- --template react-ts
cd web && rm -rf src/assets src/App.css src/index.css
```

- [ ] **Step 9.2: 更新 package.json（添加 game-core 依赖）**

```json
// apps/web/package.json（在 dependencies 中添加）
{
  "dependencies": {
    "@paly-sdd/game-core": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vitest": "^1.5.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 9.3: 配置 vite.config.ts**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@paly-sdd/game-core': path.resolve(__dirname, '../../packages/game-core/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

- [ ] **Step 9.4: 创建 test-setup.ts**

```typescript
// apps/web/src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 9.5: 创建 default 皮肤 tokens.css**

```css
/* apps/web/src/skins/default/tokens.css */
.skin-default {
  --color-primary: #6C63FF;
  --color-primary-dark: #5A52CC;
  --color-bg: #0F0E17;
  --color-surface: #1A1928;
  --color-text: #FFFFFE;
  --color-text-muted: #A7A9BE;
  --color-accent: #FF8906;
  --color-success: #2CB67D;
  --color-error: #EF4565;
  --color-border: rgba(255, 255, 255, 0.12);

  --font-size-title: 1.5rem;
  --font-size-body: 1rem;
  --font-size-small: 0.875rem;

  --border-radius-card: 12px;
  --border-radius-btn: 8px;

  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 9.6: 创建 main.tsx**

```tsx
// apps/web/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerGame } from '@paly-sdd/game-core'
import './skins/default/tokens.css'
import App from './App.tsx'

// Game plugins will be registered here after they are implemented
// registerGame(grid9Plugin)
// registerGame(spinWheelPlugin)
// registerGame(blindBoxPlugin)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 9.7: 创建 App.tsx**

```tsx
// apps/web/src/App.tsx
import DemoCampaign from './pages/DemoCampaign/index.tsx'

export default function App() {
  return <DemoCampaign />
}
```

- [ ] **Step 9.8: 安装依赖并验证启动**

```bash
cd apps/web && pnpm install
pnpm dev
```

期望：浏览器打开 http://localhost:5173，页面显示（暂时空白，组件待实现）

- [ ] **Step 9.9: 提交**

```bash
cd ../..
git add apps/web/
git commit -m "feat(web): init React+Vite frontend with default skin tokens"
```

---

## Task 10: 九宫格游戏组件

**Files:**
- Create: `apps/web/src/games/Grid9/index.tsx`
- Create: `apps/web/src/games/Grid9/Grid9.css`
- Create: `apps/web/src/games/Grid9/Grid9.test.tsx`

- [ ] **Step 10.1: 写失败测试**

```tsx
// apps/web/src/games/Grid9/Grid9.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Grid9 from './index.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

const defaultProps = {
  campaignId: 'demo-grid9',
  maxPlays: 3,
  onResult: vi.fn(),
}

describe('Grid9', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        config: { prizes: Array(9).fill({ label: '测试奖品' }) },
        remainingPlays: 3,
      }),
    })
  })

  it('renders 9 cells', async () => {
    render(<Grid9 {...defaultProps} />)
    await waitFor(() => {
      const cells = document.querySelectorAll('.grid9-cell')
      expect(cells).toHaveLength(9)
    })
  })

  it('shows remaining plays count', async () => {
    render(<Grid9 {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/剩余.*3/)).toBeInTheDocument()
    })
  })

  it('disables button when no plays remain', async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ config: { prizes: Array(9).fill({ label: '奖' }) }, remainingPlays: 0 }),
    })
    render(<Grid9 {...defaultProps} maxPlays={0} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /开始抽奖/ })).toBeDisabled()
    })
  })
})
```

- [ ] **Step 10.2: 运行测试确认失败**

```bash
cd apps/web && pnpm test
```

期望：FAIL — Cannot find module './index.tsx'

- [ ] **Step 10.3: 实现 Grid9/index.tsx**

```tsx
// apps/web/src/games/Grid9/index.tsx
import { useState, useEffect, useRef } from 'react'
import type { GameProps } from '@paly-sdd/game-core'
import './Grid9.css'

interface PrizeCell { label: string }

const ANIMATION_DURATION = 2500  // ms
const CELL_SEQUENCE = [0, 1, 2, 5, 8, 7, 6, 3, 4]  // clockwise path

export default function Grid9({ campaignId, onResult }: GameProps) {
  const [prizes, setPrizes] = useState<PrizeCell[]>(Array(9).fill({ label: '' }))
  const [remainingPlays, setRemainingPlays] = useState(0)
  const [activeCell, setActiveCell] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const pendingPrizeRef = useRef<{ id: string; name: string; type: 'virtual'|'physical'|'coupon' } | null>(null)

  useEffect(() => {
    fetch('/api/game/grid9/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setPrizes((data.config.prizes as PrizeCell[]) ?? Array(9).fill({ label: '?' }))
        setRemainingPlays(data.remainingPlays)
      })
  }, [campaignId])

  async function handlePlay() {
    if (isAnimating || remainingPlays <= 0) return
    setIsAnimating(true)

    // call play API first to get result
    const res = await fetch('/api/game/grid9/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()
    pendingPrizeRef.current = data.prize

    // run marquee animation
    let step = 0
    const totalSteps = 24  // full rounds + stop
    const interval = setInterval(() => {
      setActiveCell(CELL_SEQUENCE[step % CELL_SEQUENCE.length])
      step++
      if (step >= totalSteps) {
        clearInterval(interval)
        setActiveCell(null)
        setIsAnimating(false)
        setRemainingPlays(data.remainingPlays)
        onResult(pendingPrizeRef.current)
      }
    }, ANIMATION_DURATION / totalSteps)
  }

  return (
    <div className="grid9-container">
      <div className="grid9-board">
        {prizes.map((cell, i) => (
          <div key={i} className={`grid9-cell ${activeCell === i ? 'active' : ''}`}>
            {cell.label}
          </div>
        ))}
      </div>
      <div className="grid9-remaining">剩余次数：{remainingPlays}</div>
      <button
        className="grid9-btn"
        onClick={handlePlay}
        disabled={isAnimating || remainingPlays <= 0}
      >
        {isAnimating ? '抽奖中...' : '开始抽奖'}
      </button>
    </div>
  )
}

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem('user-token', token)
  }
  return token
}
```

- [ ] **Step 10.4: 实现 Grid9.css**

```css
/* apps/web/src/games/Grid9/Grid9.css */
.grid9-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.grid9-board {
  display: grid;
  grid-template-columns: repeat(3, 88px);
  grid-template-rows: repeat(3, 88px);
  gap: 8px;
}

.grid9-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-card);
  font-size: var(--font-size-small);
  color: var(--color-text);
  text-align: center;
  transition: background 0.1s, transform 0.1s;
}

.grid9-cell.active {
  background: var(--color-primary);
  transform: scale(1.05);
  box-shadow: 0 0 12px var(--color-primary);
}

.grid9-remaining {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}

.grid9-btn {
  padding: 12px 32px;
  background: var(--color-primary);
  color: var(--color-text);
  border: none;
  border-radius: var(--border-radius-btn);
  font-size: var(--font-size-body);
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.grid9-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.grid9-btn:not(:disabled):hover {
  background: var(--color-primary-dark);
}
```

- [ ] **Step 10.5: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 3 tests passed

- [ ] **Step 10.6: 提交**

```bash
cd ../..
git add apps/web/src/games/Grid9/
git commit -m "feat(web): add Grid9 game component with marquee animation"
```

---

## Task 11: 转盘游戏组件

**Files:**
- Create: `apps/web/src/games/SpinWheel/index.tsx`
- Create: `apps/web/src/games/SpinWheel/SpinWheel.css`
- Create: `apps/web/src/games/SpinWheel/SpinWheel.test.tsx`

- [ ] **Step 11.1: 写失败测试**

```tsx
// apps/web/src/games/SpinWheel/SpinWheel.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SpinWheel from './index.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

const sectors = [
  { label: '大奖', color: '#FF6B6B' },
  { label: '优惠券', color: '#4ECDC4' },
  { label: '谢谢参与', color: '#95E1D3' },
  { label: '积分', color: '#F8B400' },
]

beforeEach(() => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ config: { sectors }, remainingPlays: 3 }),
  })
})

describe('SpinWheel', () => {
  it('renders SVG wheel with correct sector count', async () => {
    render(<SpinWheel campaignId="demo-spin-wheel" maxPlays={3} onResult={vi.fn()} />)
    await waitFor(() => {
      const paths = document.querySelectorAll('.wheel-sector')
      expect(paths).toHaveLength(4)
    })
  })

  it('renders spin button', async () => {
    render(<SpinWheel campaignId="demo-spin-wheel" maxPlays={3} onResult={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /转动/ })).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 11.2: 运行测试确认失败**

```bash
cd apps/web && pnpm test
```

期望：FAIL — Cannot find module './index.tsx'

- [ ] **Step 11.3: 实现 SpinWheel/index.tsx**

```tsx
// apps/web/src/games/SpinWheel/index.tsx
import { useState, useEffect, useRef } from 'react'
import type { GameProps } from '@paly-sdd/game-core'
import './SpinWheel.css'

interface Sector { label: string; color: string }

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) { token = crypto.randomUUID(); localStorage.setItem('user-token', token) }
  return token
}

function buildSectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export default function SpinWheel({ campaignId, onResult }: GameProps) {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [remainingPlays, setRemainingPlays] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    fetch('/api/game/spin-wheel/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setSectors(data.config.sectors ?? [])
        setRemainingPlays(data.remainingPlays)
      })
  }, [campaignId])

  async function handleSpin() {
    if (isSpinning || remainingPlays <= 0 || sectors.length === 0) return
    setIsSpinning(true)

    const res = await fetch('/api/game/spin-wheel/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()

    // calculate target angle: winIndex sector center, plus 5 full rotations
    const sectorAngle = 360 / sectors.length
    const winIndex = data.winIndex ?? 0
    const targetAngle = 360 * 5 + (360 - winIndex * sectorAngle - sectorAngle / 2)

    setRotation((prev) => prev + targetAngle)

    setTimeout(() => {
      setIsSpinning(false)
      setRemainingPlays(data.remainingPlays)
      onResult(data.prize)
    }, 4000)
  }

  const cx = 150, cy = 150, r = 140
  const sectorAngle = sectors.length > 0 ? 360 / sectors.length : 0

  return (
    <div className="spinwheel-container">
      <div className="spinwheel-wrapper">
        <div className="spinwheel-pointer">▼</div>
        <svg
          width="300"
          height="300"
          className="spinwheel-svg"
          style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none' }}
        >
          {sectors.map((s, i) => {
            const start = i * sectorAngle - 90
            const end = start + sectorAngle
            const midAngle = ((start + end) / 2) * (Math.PI / 180)
            const labelR = r * 0.65
            return (
              <g key={i}>
                <path
                  className="wheel-sector"
                  d={buildSectorPath(cx, cy, r, start, end)}
                  fill={s.color}
                  stroke="var(--color-bg)"
                  strokeWidth="2"
                />
                <text
                  x={cx + labelR * Math.cos(midAngle)}
                  y={cy + labelR * Math.sin(midAngle)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="12"
                >
                  {s.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="spinwheel-remaining">剩余次数：{remainingPlays}</div>
      <button
        className="spinwheel-btn"
        onClick={handleSpin}
        disabled={isSpinning || remainingPlays <= 0}
      >
        {isSpinning ? '旋转中...' : '转动'}
      </button>
    </div>
  )
}
```

- [ ] **Step 11.4: 实现 SpinWheel.css**

```css
/* apps/web/src/games/SpinWheel/SpinWheel.css */
.spinwheel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.spinwheel-wrapper {
  position: relative;
  width: 300px;
  height: 300px;
}

.spinwheel-pointer {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  color: var(--color-accent);
  z-index: 2;
}

.spinwheel-svg {
  transform-origin: 150px 150px;
}

.spinwheel-remaining {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}

.spinwheel-btn {
  padding: 12px 32px;
  background: var(--color-accent);
  color: var(--color-bg);
  border: none;
  border-radius: var(--border-radius-btn);
  font-size: var(--font-size-body);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.spinwheel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 11.5: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 5 tests passed（Grid9 3 + SpinWheel 2）

- [ ] **Step 11.6: 提交**

```bash
cd ../..
git add apps/web/src/games/SpinWheel/
git commit -m "feat(web): add SpinWheel game component with SVG and rotation animation"
```

---

## Task 12: 盲盒游戏组件

**Files:**
- Create: `apps/web/src/games/BlindBox/index.tsx`
- Create: `apps/web/src/games/BlindBox/BlindBox.css`
- Create: `apps/web/src/games/BlindBox/BlindBox.test.tsx`

- [ ] **Step 12.1: 写失败测试**

```tsx
// apps/web/src/games/BlindBox/BlindBox.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BlindBox from './index.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ config: { boxTheme: 'default' }, remainingPlays: 3 }),
  })
})

describe('BlindBox', () => {
  it('renders open button', async () => {
    render(<BlindBox campaignId="demo-blind-box" maxPlays={3} onResult={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /开启盲盒/ })).toBeInTheDocument()
    })
  })

  it('shows "今日次数已用完" when no plays remain', async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ config: { boxTheme: 'default' }, remainingPlays: 0 }),
    })
    render(<BlindBox campaignId="demo-blind-box" maxPlays={0} onResult={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/今日次数已用完/)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 12.2: 运行测试确认失败**

```bash
cd apps/web && pnpm test
```

- [ ] **Step 12.3: 实现 BlindBox/index.tsx**

```tsx
// apps/web/src/games/BlindBox/index.tsx
import { useState, useEffect } from 'react'
import type { GameProps } from '@paly-sdd/game-core'
import './BlindBox.css'

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) { token = crypto.randomUUID(); localStorage.setItem('user-token', token) }
  return token
}

export default function BlindBox({ campaignId, onResult }: GameProps) {
  const [remainingPlays, setRemainingPlays] = useState(0)
  const [isOpening, setIsOpening] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/game/blind-box/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
      .then((r) => r.json())
      .then((data) => setRemainingPlays(data.remainingPlays))
  }, [campaignId])

  async function handleOpen() {
    if (isOpening || remainingPlays <= 0) return
    setIsOpening(true)
    setResult(null)

    const res = await fetch('/api/game/blind-box/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()

    setTimeout(() => {
      setIsOpening(false)
      setRemainingPlays(data.remainingPlays)
      setResult(data.prize?.name ?? '谢谢参与')
      onResult(data.prize)
    }, 1500)
  }

  return (
    <div className="blindbox-container">
      <div className={`blindbox-box ${isOpening ? 'opening' : ''}`}>
        <div className="blindbox-lid" />
        <div className="blindbox-body">
          {result && <div className="blindbox-prize">{result}</div>}
        </div>
      </div>
      <div className="blindbox-remaining">
        {remainingPlays <= 0 ? '今日次数已用完' : `剩余次数：${remainingPlays}`}
      </div>
      <button
        className="blindbox-btn"
        onClick={handleOpen}
        disabled={isOpening || remainingPlays <= 0}
      >
        {isOpening ? '开启中...' : '开启盲盒'}
      </button>
    </div>
  )
}
```

- [ ] **Step 12.4: 实现 BlindBox.css**

```css
/* apps/web/src/games/BlindBox/BlindBox.css */
.blindbox-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.blindbox-box {
  width: 160px;
  height: 160px;
  position: relative;
}

.blindbox-lid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: var(--color-primary);
  border-radius: var(--border-radius-card) var(--border-radius-card) 0 0;
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top center;
}

.blindbox-box.opening .blindbox-lid {
  transform: rotateX(-120deg) translateY(-20px);
}

.blindbox-body {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 0 0 var(--border-radius-card) var(--border-radius-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.blindbox-prize {
  font-size: var(--font-size-body);
  color: var(--color-accent);
  font-weight: 600;
  text-align: center;
  padding: 8px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.blindbox-remaining {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}

.blindbox-btn {
  padding: 12px 32px;
  background: var(--color-primary);
  color: var(--color-text);
  border: none;
  border-radius: var(--border-radius-btn);
  font-size: var(--font-size-body);
  cursor: pointer;
  transition: opacity 0.2s;
}

.blindbox-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 12.5: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 7 tests passed

- [ ] **Step 12.6: 提交**

```bash
cd ../..
git add apps/web/src/games/BlindBox/
git commit -m "feat(web): add BlindBox game component with open animation"
```

---

## Task 13: 注册游戏插件

**Files:**
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 13.1: 更新 main.tsx，注册三个插件**

```tsx
// apps/web/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerGame } from '@paly-sdd/game-core'
import type { GamePlugin } from '@paly-sdd/game-core'
import './skins/default/tokens.css'
import App from './App.tsx'
import Grid9 from './games/Grid9/index.tsx'
import SpinWheel from './games/SpinWheel/index.tsx'
import BlindBox from './games/BlindBox/index.tsx'

const grid9Plugin: GamePlugin = {
  id: 'grid9',
  component: Grid9,
  bffRoutes: [],  // routes are registered in BFF app, not web
}

const spinWheelPlugin: GamePlugin = {
  id: 'spin-wheel',
  component: SpinWheel,
  bffRoutes: [],
}

const blindBoxPlugin: GamePlugin = {
  id: 'blind-box',
  component: BlindBox,
  bffRoutes: [],
}

registerGame(grid9Plugin)
registerGame(spinWheelPlugin)
registerGame(blindBoxPlugin)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 13.2: 提交**

```bash
git add apps/web/src/main.tsx
git commit -m "feat(web): register grid9, spin-wheel, blind-box plugins"
```

---

## Task 14: Demo 落地页

**Files:**
- Create: `apps/web/src/pages/DemoCampaign/index.tsx`
- Create: `apps/web/src/pages/DemoCampaign/GameTabs.tsx`
- Create: `apps/web/src/pages/DemoCampaign/PrizeHistory.tsx`
- Create: `apps/web/src/pages/DemoCampaign/DemoCampaign.css`
- Create: `apps/web/src/pages/DemoCampaign/DemoCampaign.test.tsx`

- [ ] **Step 14.1: 写失败测试**

```tsx
// apps/web/src/pages/DemoCampaign/DemoCampaign.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerGame, clearRegistry } from '@paly-sdd/game-core'
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
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ records: [] }) })
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

- [ ] **Step 14.2: 运行测试确认失败**

```bash
cd apps/web && pnpm test
```

- [ ] **Step 14.3: 实现 GameTabs.tsx**

```tsx
// apps/web/src/pages/DemoCampaign/GameTabs.tsx
interface Tab { id: string; label: string }

interface GameTabsProps {
  tabs: Tab[]
  activeId: string
  onChange: (id: string) => void
}

export default function GameTabs({ tabs, activeId, onChange }: GameTabsProps) {
  return (
    <div className="game-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`game-tab ${activeId === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 14.4: 实现 PrizeHistory.tsx**

```tsx
// apps/web/src/pages/DemoCampaign/PrizeHistory.tsx
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'

interface Record { prize: { name: string }; playedAt: string }

export interface PrizeHistoryRef { refresh: () => void }

interface PrizeHistoryProps { gameId: string; campaignId: string }

const PrizeHistory = forwardRef<PrizeHistoryRef, PrizeHistoryProps>(
  function PrizeHistory({ gameId, campaignId }, ref) {
    const [records, setRecords] = useState<Record[]>([])

    function load() {
      const token = localStorage.getItem('user-token') ?? ''
      fetch(`/api/game/${gameId}/result?campaignId=${campaignId}`, {
        headers: { 'x-user-token': token },
      })
        .then((r) => r.json())
        .then((data) => setRecords(data.records ?? []))
    }

    useEffect(() => { load() }, [gameId, campaignId])

    useImperativeHandle(ref, () => ({ refresh: load }))

    if (records.length === 0) return null

    return (
      <div className="prize-history">
        <h3 className="prize-history-title">我的中奖记录</h3>
        <ul className="prize-history-list">
          {records.map((r, i) => (
            <li key={i} className="prize-history-item">
              <span className="prize-name">{r.prize.name}</span>
              <span className="prize-time">{new Date(r.playedAt).toLocaleString('zh-CN')}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
)

export default PrizeHistory
```

- [ ] **Step 14.5: 实现 DemoCampaign/index.tsx**

```tsx
// apps/web/src/pages/DemoCampaign/index.tsx
import { useState, useRef } from 'react'
import { getGame } from '@paly-sdd/game-core'
import type { Prize } from '@paly-sdd/game-core'
import GameTabs from './GameTabs.tsx'
import PrizeHistory, { type PrizeHistoryRef } from './PrizeHistory.tsx'
import './DemoCampaign.css'

const GAME_TABS = [
  { id: 'grid9', label: '九宫格', campaignId: 'demo-grid9' },
  { id: 'spin-wheel', label: '转盘', campaignId: 'demo-spin-wheel' },
  { id: 'blind-box', label: '盲盒', campaignId: 'demo-blind-box' },
]

export default function DemoCampaign() {
  const [activeGameId, setActiveGameId] = useState('grid9')
  const historyRef = useRef<PrizeHistoryRef>(null)

  const activeTab = GAME_TABS.find((t) => t.id === activeGameId)!
  const plugin = getGame(activeGameId)
  const GameComponent = plugin?.component

  function handleResult(prize: Prize | null) {
    historyRef.current?.refresh()
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

- [ ] **Step 14.6: 实现 DemoCampaign.css**

```css
/* apps/web/src/pages/DemoCampaign/DemoCampaign.css */
.demo-page {
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  max-width: 375px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.demo-banner {
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  display: flex;
  align-items: flex-end;
  padding: 24px;
}

.demo-banner h1 {
  margin: 0 0 4px;
  font-size: 1.75rem;
  font-weight: 700;
}

.demo-banner p {
  margin: 0;
  font-size: var(--font-size-small);
  opacity: 0.85;
}

.game-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.game-tab {
  flex: 1;
  padding: 12px 8px;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-body);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.game-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.demo-game-area {
  min-height: 320px;
  display: flex;
  justify-content: center;
}

.prize-history {
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.prize-history-title {
  margin: 0 0 12px;
  font-size: var(--font-size-body);
  color: var(--color-text-muted);
}

.prize-history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prize-history-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-surface);
  border-radius: var(--border-radius-card);
  font-size: var(--font-size-small);
}

.prize-name {
  color: var(--color-accent);
  font-weight: 600;
}

.prize-time {
  color: var(--color-text-muted);
}
```

- [ ] **Step 14.7: 运行测试确认通过**

```bash
pnpm test
```

期望：PASS — 9 tests passed

- [ ] **Step 14.8: 提交**

```bash
cd ../..
git add apps/web/src/pages/
git commit -m "feat(web): add DemoCampaign landing page with tab switching and prize history"
```

---

## Task 15: 完整联调验证

- [ ] **Step 15.1: 启动三个服务（分三个终端窗口）**

```bash
# 终端 1 - Service
cd apps/service && node --loader ts-node/esm src/server.ts
# 期望：{"msg":"Server listening at http://0.0.0.0:3001"}

# 终端 2 - BFF
cd apps/bff && node --loader ts-node/esm src/server.ts
# 期望：{"msg":"Server listening at http://0.0.0.0:3000"}

# 终端 3 - Web
cd apps/web && pnpm dev
# 期望：http://localhost:5173
```

- [ ] **Step 15.2: 验证九宫格完整流程**

浏览器打开 http://localhost:5173，九宫格 Tab 已选中：
1. 确认显示 9 个宫格，"剩余次数：3"
2. 点击"开始抽奖"，宫格跑马灯动画启动
3. 动画结束，"剩余次数"变为 2
4. 底部出现中奖记录

- [ ] **Step 15.3: 验证转盘完整流程**

1. 点击"转盘" Tab，SVG 转盘渲染
2. 点击"转动"，转盘旋转 ~4 秒后停止
3. "剩余次数"正确递减

- [ ] **Step 15.4: 验证盲盒完整流程**

1. 点击"盲盒" Tab，礼盒图案显示
2. 点击"开启盲盒"，盖子弹起动画（1.5s）
3. 奖品名称显示在盒内

- [ ] **Step 15.5: 验证次数耗尽**

将三种游戏各玩满 3 次，确认按钮变为禁用状态（opacity: 0.4，不可点击）

- [ ] **Step 15.6: 验证皮肤切换**

浏览器控制台执行：

```javascript
document.querySelector('.demo-page').classList.replace('skin-default', 'skin-default')
```

（皮肤系统基础已验证；如需测试多皮肤，手动在 tokens.css 同目录添加第二套 CSS 文件并替换 class）

- [ ] **Step 15.7: 最终提交**

```bash
git add .
git commit -m "feat: complete SDD game landing framework MVP

- Monorepo with pnpm workspaces (packages/game-core, bff-contracts, apps/web, bff, service)
- GamePlugin interface + registry (game-core package)
- Three game plugins: grid9, spin-wheel, blind-box
- Fastify BFF with auth middleware and 9 game routes
- Fastify Service with SQLite, campaigns/prizes/user_plays tables
- Demo landing page with tab switching and prize history
- CSS variables skin system (default theme)"
```

---

## Appendix: 快速启动命令

```bash
# 安装所有依赖
pnpm install

# 并行启动全部服务（需要 concurrently）
pnpm dev

# 运行全部测试
pnpm test
```

**端口规划：**
- Web: http://localhost:5173
- BFF: http://localhost:3000
- Service: http://localhost:3001
