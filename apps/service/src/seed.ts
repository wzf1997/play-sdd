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
  db.prepare(taskSql).run('task-grid9-first-play', 'demo-grid9', '首次游玩', '首次体验九宫格即可领奖', 'once', 1, 'play', grid9PrizeIds['三等奖 积分×10'], 1)
  db.prepare(taskSql).run('task-grid9-three-plays', 'demo-grid9', '累计3次游玩', '累计游玩3次解锁大奖', 'cumulative', 3, 'play', grid9PrizeIds['二等奖 优惠券50元'], 2)

  // spin-wheel tasks
  db.prepare(taskSql).run('task-spin-first-play', 'demo-spin-wheel', '首次转盘', '首次体验转盘即可领奖', 'once', 1, 'play', spinPrizeIds['积分×5'], 1)
  db.prepare(taskSql).run('task-spin-first-win', 'demo-spin-wheel', '赢得奖品', '首次赢得奖品', 'once', 1, 'win', spinPrizeIds['优惠券20元'], 2)

  // blind-box tasks
  db.prepare(taskSql).run('task-box-first-play', 'demo-blind-box', '开启盲盒', '首次开启盲盒即可领奖', 'once', 1, 'play', boxPrizeIds['积分×20'], 1)
  db.prepare(taskSql).run('task-box-three-plays', 'demo-blind-box', '累计3次开箱', '累计开启3次盲盒', 'cumulative', 3, 'play', boxPrizeIds['优惠券30元'], 2)
}
