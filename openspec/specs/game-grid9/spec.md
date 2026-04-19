## ADDED Requirements

### Requirement: 九宫格 React 组件
系统 SHALL 提供 `Grid9` React 组件，实现 `GameProps` 接口，渲染 3×3 宫格布局，每格显示奖品图标，用户点击"开始抽奖"后依次高亮宫格（跑马灯动画），停止时高亮中奖格并弹出结果。

#### Scenario: 用户触发抽奖动画
- **WHEN** 用户点击"开始抽奖"按钮，且 remainingPlays > 0
- **THEN** 宫格按顺序循环高亮，动画持续 2-3 秒后停止，停止于中奖格

#### Scenario: 次数耗尽时禁用按钮
- **WHEN** remainingPlays 为 0
- **THEN** "开始抽奖"按钮显示为禁用状态，不可点击

#### Scenario: 动画结束后调用 onResult
- **WHEN** 跑马灯动画结束
- **THEN** 组件调用 props.onResult 并传入 Prize 对象

---

### Requirement: 九宫格 BFF 路由
系统 SHALL 在 BFF 层注册 grid9 游戏的三个标准路由：init / play / result，遵循 bff-game-api spec 中定义的接口契约。

#### Scenario: init 接口返回九宫格配置
- **WHEN** 请求 POST /api/game/grid9/init
- **THEN** 返回 config 中包含 prizes 数组（9 个奖品或空格占位）

---

### Requirement: 九宫格业务规则
每个用户每个活动 SHALL 最多可玩 maxPlays 次（由活动配置决定），每次抽奖结果由服务层根据奖品权重随机决定，可返回 null（未中奖）。

#### Scenario: 按权重随机返回奖品
- **WHEN** 服务层执行抽奖逻辑
- **THEN** 返回奖品概率与奖品池配置的 weight 字段成正比
