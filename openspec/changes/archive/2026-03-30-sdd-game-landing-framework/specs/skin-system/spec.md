## ADDED Requirements

### Requirement: CSS Variables 皮肤 Token 规范
系统 SHALL 定义一套标准 CSS variables 命名规范，至少包含：`--color-primary`、`--color-bg`、`--color-text`、`--color-accent`、`--font-size-title`、`--font-size-body`、`--border-radius-card`。所有游戏组件 MUST 仅通过这些变量引用颜色、字体和圆角，不得硬编码具体值。

#### Scenario: 游戏组件使用 CSS variables 渲染
- **WHEN** 根元素应用 skin-default class
- **THEN** 所有游戏组件使用 --color-primary 等变量正常着色，无硬编码颜色

---

### Requirement: default 皮肤
系统 SHALL 提供名为 `default` 的皮肤包，位于 `apps/web/src/skins/default/tokens.css`，定义所有标准 CSS variables 的具体值，配色以蓝紫主色调为主。

#### Scenario: 应用 default 皮肤
- **WHEN** 根元素 class 为 skin-default
- **THEN** 页面以蓝紫主色调正常显示

---

### Requirement: 皮肤运行时切换
系统 SHALL 支持通过替换根元素 class 的方式在运行时切换皮肤，切换后页面所有使用 CSS variables 的元素立即更新外观，无需刷新页面。

#### Scenario: 运行时切换皮肤
- **WHEN** 根元素 class 从 skin-default 变更为 skin-dark
- **THEN** 页面颜色、背景等立即更新为 dark 皮肤定义的值
