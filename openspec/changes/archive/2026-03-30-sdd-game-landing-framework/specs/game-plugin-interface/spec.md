## ADDED Requirements

### Requirement: GamePlugin 标准接口定义
系统 SHALL 提供 `GamePlugin` TypeScript 接口，包含 `id: string`、`component: React.ComponentType<GameProps>`、`bffRoutes: BffRoute[]` 三个字段，作为所有游戏插件的统一契约。

#### Scenario: 合法插件通过类型检查
- **WHEN** 开发者实现一个包含 id、component、bffRoutes 的对象
- **THEN** TypeScript 编译器不报错，该对象可赋值给 GamePlugin 类型

#### Scenario: 缺少必填字段时类型报错
- **WHEN** 开发者实现的插件对象缺少 component 字段
- **THEN** TypeScript 编译器报类型错误，构建失败

---

### Requirement: GameProps 标准 Props 接口
系统 SHALL 提供 `GameProps` 接口，包含 `campaignId: string`、`maxPlays: number`、`skin?: string`、`onResult: (prize: Prize) => void`，所有游戏 React 组件 MUST 接受此接口。

#### Scenario: 游戏组件接收 Props 并触发回调
- **WHEN** 父组件传入 campaignId、maxPlays、onResult
- **THEN** 游戏组件正常渲染，用户完成一次游戏后调用 onResult 并传入 Prize 对象

---

### Requirement: 游戏注册表（Registry）
系统 SHALL 提供 `registerGame(plugin: GamePlugin): void` 和 `getGame(id: string): GamePlugin | undefined` 两个函数，注册表为内存单例，应用启动时完成静态注册。

#### Scenario: 注册并获取游戏插件
- **WHEN** 调用 registerGame({ id: 'grid9', ... })
- **THEN** getGame('grid9') 返回该插件对象

#### Scenario: 获取未注册的游戏
- **WHEN** 调用 getGame('unknown-game')
- **THEN** 返回 undefined，不抛出异常

---

### Requirement: BffRoute 接口定义
系统 SHALL 提供 `BffRoute` 接口，包含 `method: 'GET' | 'POST'`、`path: string`、`handler: RouteHandler`，BFF 服务启动时遍历所有已注册插件的 bffRoutes 并挂载到 Fastify 实例。

#### Scenario: BFF 自动注册游戏路由
- **WHEN** BFF 服务启动，注册表中已有 grid9 插件
- **THEN** Fastify 实例上存在 POST /api/game/grid9/init 等路由，可正常响应请求

---

### Requirement: Prize 类型定义
系统 SHALL 提供 `Prize` 接口，包含 `id: string`、`name: string`、`type: 'virtual' | 'physical' | 'coupon'`。

#### Scenario: 服务层返回的奖品数据符合 Prize 类型
- **WHEN** 服务层查询奖品池并返回结果
- **THEN** 返回对象包含 id、name、type 三个字段，type 为枚举值之一
