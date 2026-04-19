## ADDED Requirements

### Requirement: 游戏初始化接口
系统 SHALL 提供 `POST /api/game/:gameId/init` 端点，接受 `{ userId: string, campaignId: string }`，返回 `{ config: object, remainingPlays: number }`，其中 config 由各游戏插件定义，remainingPlays 为当前用户该活动剩余可玩次数。

#### Scenario: 正常获取活动配置
- **WHEN** 用户携带有效 x-user-token 请求 POST /api/game/grid9/init
- **THEN** 返回 200，包含活动配置和剩余次数

#### Scenario: 活动不存在时返回 404
- **WHEN** campaignId 不存在于数据库
- **THEN** 返回 404 { error: 'campaign not found' }

---

### Requirement: 游戏执行接口
系统 SHALL 提供 `POST /api/game/:gameId/play` 端点，接受 `{ userId: string, campaignId: string }`，执行一次抽奖逻辑，返回 `{ prize: Prize | null, remainingPlays: number }`。

#### Scenario: 正常执行一次抽奖
- **WHEN** 用户有剩余次数，请求 POST /api/game/grid9/play
- **THEN** 返回 200，包含中奖结果（可为 null 表示未中奖）和剩余次数

#### Scenario: 次数耗尽时返回 403
- **WHEN** 用户 remainingPlays 为 0，请求 play 接口
- **THEN** 返回 403 { error: 'no plays remaining' }

#### Scenario: 缺少 x-user-token 时返回 401
- **WHEN** 请求不携带 x-user-token header
- **THEN** 返回 401 { error: 'unauthorized' }

---

### Requirement: 中奖记录查询接口
系统 SHALL 提供 `GET /api/game/:gameId/result?userId=&campaignId=` 端点，返回 `{ records: Array<{ prize: Prize, playedAt: string }> }`，按时间倒序排列。

#### Scenario: 正常查询中奖记录
- **WHEN** 用户请求 GET /api/game/grid9/result 并传入 userId 和 campaignId
- **THEN** 返回 200，包含该用户该活动的所有中奖记录

#### Scenario: 无中奖记录时返回空数组
- **WHEN** 用户从未在该活动中获奖
- **THEN** 返回 200 { records: [] }

---

### Requirement: 请求限流
BFF 层 SHALL 对每个 userId 的 play 接口实施限流，同一 userId 在 1 秒内请求超过 5 次时返回 429。

#### Scenario: 超出限流阈值
- **WHEN** 同一 userId 在 1 秒内发送 6 次 play 请求
- **THEN** 第 6 次返回 429 { error: 'rate limit exceeded' }
