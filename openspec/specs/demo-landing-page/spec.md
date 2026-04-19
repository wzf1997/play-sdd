## ADDED Requirements

### Requirement: Demo 落地页结构
系统 SHALL 提供 `DemoCampaign` React 页面组件，页面从上到下包含：活动 Banner 区（全屏头图）、活动标题 + 倒计时、玩法选择 Tab（三个 Tab 对应三种游戏）、游戏组件区域、我的中奖记录列表，总宽度适配 375px 移动端。

#### Scenario: 页面正常渲染三个 Tab
- **WHEN** 访问 Demo 落地页
- **THEN** 页面显示 Banner、Tab 栏（九宫格 | 转盘 | 盲盒）和默认选中的第一个游戏组件

---

### Requirement: Tab 切换游戏组件
系统 SHALL 支持点击 Tab 切换当前渲染的游戏组件，切换时使用 `getGame(id)` 从注册表动态获取组件，当前 Tab 对应的游戏组件正常挂载，其余游戏组件卸载（不保留状态）。

#### Scenario: 切换到转盘 Tab
- **WHEN** 用户点击"转盘"Tab
- **THEN** 九宫格组件卸载，SpinWheel 组件挂载并正常渲染

---

### Requirement: 中奖记录展示
页面 SHALL 在底部展示当前用户在该活动的所有中奖记录，调用 GET /api/game/:gameId/result 获取，每条记录显示奖品名称和中奖时间，按时间倒序排列。

#### Scenario: 完成抽奖后记录列表自动刷新
- **WHEN** 用户完成一次抽奖，onResult 回调被触发
- **THEN** 中奖记录列表重新请求接口并更新显示

---

### Requirement: Demo 活动数据初始化
系统 SHALL 在 Service 服务启动时自动检测并插入 Demo 活动数据（若不存在），包含：campaignId 为 `demo-001`、三种玩法各一个活动、每个活动含 4-9 个奖品、maxPlays 为 3。

#### Scenario: 首次启动自动初始化 Demo 数据
- **WHEN** Service 服务首次启动，数据库为空
- **THEN** campaigns 和 prizes 表中存在 demo-001 相关数据，BFF 可正常响应 init 请求
