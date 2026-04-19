## ADDED Requirements

### Requirement: 盲盒 React 组件
系统 SHALL 提供 `BlindBox` React 组件，实现 `GameProps` 接口，渲染一个礼盒图案，用户点击"开启盲盒"后播放盒子打开动画（盖子弹起 + 光效），动画结束后展示中奖物品及名称。

#### Scenario: 用户触发开箱动画
- **WHEN** 用户点击"开启盲盒"按钮，且 remainingPlays > 0
- **THEN** 礼盒播放开启动画（约 1.5 秒），动画结束后展示奖品图标和名称

#### Scenario: 次数耗尽时显示提示
- **WHEN** remainingPlays 为 0
- **THEN** 组件显示"今日次数已用完"文字，按钮不可点击

#### Scenario: 动画结束后调用 onResult
- **WHEN** 开箱动画结束
- **THEN** 组件调用 props.onResult 并传入 Prize 对象

---

### Requirement: 盲盒 BFF 路由
系统 SHALL 在 BFF 层注册 blind-box 游戏的三个标准路由：init / play / result，init 返回的 config 中包含 boxTheme（礼盒外观主题，如 'default' | 'luxury'）。

#### Scenario: init 接口返回盲盒主题配置
- **WHEN** 请求 POST /api/game/blind-box/init
- **THEN** 返回 config.boxTheme 字段，值为有效主题名称

---

### Requirement: 盲盒业务规则
盲盒 SHALL 每次 play 请求由服务层按权重随机从奖品池选取一个奖品返回，同一用户不保证去重（可重复中同一奖品）。

#### Scenario: 可重复返回同一奖品
- **WHEN** 用户多次开启盲盒
- **THEN** 服务层每次独立随机，不考虑历史记录去重
