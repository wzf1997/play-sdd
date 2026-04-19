## ADDED Requirements

### Requirement: 数据模型 - campaigns 表
系统 SHALL 维护 `campaigns` 表，字段包含：`id TEXT PRIMARY KEY`、`name TEXT`、`game_id TEXT`（游戏插件 ID）、`max_plays INTEGER`、`start_at TEXT`（ISO 8601）、`end_at TEXT`、`config JSON`（各游戏自定义配置）、`created_at TEXT`。

#### Scenario: 创建活动记录
- **WHEN** 插入一条 campaigns 记录
- **THEN** 记录包含有效的 id、game_id、max_plays、start_at、end_at

---

### Requirement: 数据模型 - prizes 表
系统 SHALL 维护 `prizes` 表，字段包含：`id TEXT PRIMARY KEY`、`campaign_id TEXT`（外键）、`name TEXT`、`type TEXT`（virtual/physical/coupon）、`weight INTEGER`（抽奖权重，值越大概率越高）、`stock INTEGER`（-1 表示无限库存）。

#### Scenario: 按权重随机抽奖
- **WHEN** 服务层执行抽奖，奖品池中有 weight 不同的奖品
- **THEN** 高 weight 奖品被抽中的频率更高（统计意义上）

#### Scenario: 库存耗尽时跳过该奖品
- **WHEN** 某奖品 stock 为 0
- **THEN** 抽奖时不考虑该奖品，从剩余有库存的奖品中选取

---

### Requirement: 数据模型 - user_plays 表
系统 SHALL 维护 `user_plays` 表，字段包含：`id TEXT PRIMARY KEY`、`user_id TEXT`、`campaign_id TEXT`、`game_id TEXT`、`prize_id TEXT`（可为 NULL 表示未中奖）、`played_at TEXT`（ISO 8601）。

#### Scenario: 记录一次抽奖
- **WHEN** 用户执行一次抽奖
- **THEN** user_plays 表新增一条记录，played_at 为当前 UTC 时间

---

### Requirement: 剩余次数计算
服务层 SHALL 通过 `max_plays - COUNT(user_plays WHERE user_id=? AND campaign_id=?)` 计算剩余次数，当结果 ≤ 0 时拒绝抽奖并返回错误。

#### Scenario: 剩余次数用完后拒绝抽奖
- **WHEN** 用户已抽奖次数等于 max_plays
- **THEN** 服务层返回 { error: 'no plays remaining' }，不插入新记录
