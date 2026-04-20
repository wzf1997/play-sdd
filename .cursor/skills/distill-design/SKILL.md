---
name: distill-design
description: 从代码仓库反向蒸馏出 design.md 设计规范文档。适用于没有设计稿的老项目、赶工 MVP、或需要补写设计文档的场景。工作流：扫描 token 文件 → 扫描组件层 → 推断隐性约定 → 生成结构化 design.md。当用户提到「没有设计稿」「反推设计系统」「老项目补文档」「蒸馏 design.md」「从代码提取设计规范」「distill design」「代码里提取样式」「生成设计文档」「反向工程设计稿」时触发。
---

# /distill-design

从代码仓库蒸馏出 `design.md`，把散在代码各处的设计决策提炼、归集、成文。

**核心原则**：只写有证据的内容；低频值标 ⚠️；找不到数据宁可跳过，不编造。

---

## 前置：确定扫描范围

用户调用时，先确认仓库路径。若未指定，默认为当前工作区根目录。

```
目标路径：{repo_root}
输出路径：{repo_root}/design.md（或用户指定路径）
```

读取 `references/scan-patterns.md` → 获取文件扫描清单和正则模式（在 Step 1 前读取一次即可）。

---

## Step 1 — 扫描 Token 层

**目标**：提取显式定义的设计 token（颜色、圆角、间距、字体、阴影）。

### 1.1 定位 token 文件

按 `scan-patterns.md → Token 文件扫描清单` 中的优先顺序，在仓库根目录及 `src/` 下查找：

```
tailwind.config.*  →  读取 theme.extend（自定义 token）
theme.ts / tokens.ts / design-tokens.*  →  读取全部导出值
variables.css / _variables.scss  →  提取所有 --xxx: 声明
styles/globals.css / src/index.css  →  提取 :root 中的 CSS 变量
constants.ts（含颜色关键字的行）  →  提取颜色/尺寸常量
```

### 1.2 提取值

对每个找到的文件，用 `scan-patterns.md → 值提取正则模式` 中的模式提取：
- 所有颜色值（hex / rgba / hsl）
- 所有 border-radius 值
- 所有 font-size / font-family 声明
- 所有 box-shadow / drop-shadow 定义
- 所有间距常量（如 `spacing: { sm: '8px' }`）

### 1.3 记录来源

每个提取到的值记录 `{值} → {文件名}:{行号或变量名}`，供生成文档时引用。

---

## Step 2 — 扫描组件层

**目标**：从组件代码中提取隐性 token 和组件规范。

### 2.1 定位核心组件

按 `scan-patterns.md → 组件文件扫描清单` 查找组件文件。优先处理：
- 被 import ≥ 3 次的组件（高复用 = 核心组件）
- 文件名含 `Button / Card / Badge / Tag / Modal / Header / Nav / Input` 的文件

### 2.2 从组件提取

对每个组件文件，提取：

**内联 style 对象**（React/JSX）：
```jsx
style={{ borderRadius: '3px', color: '#03C3C7' }}
```
→ 用正则 `style=\{\{([^}]+)\}\}` 捕获，解析键值对

**Tailwind className**：
```jsx
className="rounded-lg text-sm font-semibold bg-primary"
```
→ 统计各 utility 出现频率；用 `scan-patterns.md → Tailwind Utility 映射表` 翻译为具体值

**状态变体**：识别以下模式的样式差异：
- 条件渲染：`isActive ? styleA : styleB`
- 状态 class：`active / selected / disabled / hover / focus`
- 伪类：`hover:` / `focus:` / `disabled:` Tailwind 前缀

**动效定义**：
```
transition: all 0.2s ease
transform: scale(0.97)
animation: fadeIn 0.3s ease
```

### 2.3 识别隐性 token

将 Step 1 + Step 2 提取到的所有值合并，统计频率：
- 某颜色值出现 ≥ 5 次 → 视为品牌色 / 功能色
- 某 border-radius 值出现 ≥ 5 次 → 视为默认圆角规则
- 某 padding 值出现 ≥ 3 次 → 视为间距节点

---

## Step 3 — 推断隐性约定

**目标**：发现没有显式声明但全局一致执行的规则。

### 3.1 间距体系

统计所有提取到的 padding / margin / gap 数值（px），找最大公约数：
- 若 8/16/24/32 出现频率最高 → 基础单位 8px
- 若 4/8/12/16 → 基础单位 4px
- 若差异很大，无规律 → 标注「间距体系不统一」

### 3.2 视觉风格分族

若发现以下信号，判断存在多套视觉体系：
- 两个明显不同的主色（非语义色），各自出现 ≥ 5 次
- 同一类元素（如按钮圆角）存在两种截然不同的值（如 `3px` 和 `24px`）
- 页面文件名暗示场景分层（`login/` vs `dashboard/`、`onboarding/` vs `main/`）

确认后：按场景分组，命名为「A 套」「B 套」或更具语义的名称。

### 3.3 命名模式

分析文件名和变量名：
- 组件命名：PascalCase / kebab-case / BEM，检查是否有 feature 前缀
- CSS 变量命名：是否有统一前缀（`--brand-` / `--color-` / `--app-`）
- 颜色变量语义：是否用 `primary/secondary/accent` 还是具体颜色名

### 3.4 特殊规则识别

检查是否存在以下模式（出现 ≥ 3 次即视为约定）：
- 所有滚动容器是否有 `scrollbarWidth: 'none'` / `overflow-scrolling: touch`
- 图片是否统一通过某个 wrapper 组件渲染（如 `ImageWithFallback`）
- 数字/价格是否统一使用特定字体（如 SF Pro、Tabular nums）
- 按钮按压是否统一用 `scale(0.97/0.98)` + transition

---

## Step 4 — 生成 design.md

**目标**：按 `references/design-md-template.md` 的结构，将 Step 1-3 的蒸馏结果写成文档。

### 4.1 读取模板

读取 `references/design-md-template.md`，按其章节顺序填充内容。

### 4.2 章节填充规则

| 章节 | 填充依据 | 无数据时 |
|------|---------|---------|
| 0. 视觉风格总览 | Step 3.2 的分族结果 | 写单套调性描述 |
| 1.1 颜色 | Step 1 + Step 2 高频色值 | 标注「未提取到显式色值定义」 |
| 1.2 圆角 | Step 1 + Step 2 border-radius | 标注 ⚠️ 或跳过 |
| 1.3 间距 | Step 3.1 推断结果 | 标注「间距体系不统一」 |
| 1.4 字体 | Step 1 font-family / font-size | 跳过 |
| 1.5 阴影 | Step 1+2 box-shadow | 标注「（未检测到自定义阴影）」 |
| 2.x 组件规范 | Step 2.2 各核心组件 | 仅列有足够数据的组件 |
| 3. 动效 | Step 2.2 transition/animation | 标注「无统一动效规范」 |
| 4. 响应式 | Step 3 @media / Tailwind 前缀 | 标注「固定宽度移动端布局」 |
| 5. 隐性约定 | Step 3.3 + Step 3.4 | 列出所有已识别规则 |

### 4.3 质量检查（写完后自查）

- [ ] 每个颜色值都有来源标注 `[来源：文件名]`
- [ ] 低频值（< 3 次）已标注 ⚠️
- [ ] 无数据的章节已标注跳过原因，没有编造内容
- [ ] 末尾「蒸馏说明」已填写实际扫描文件列表
- [ ] 若存在多套视觉体系，第 0 节有对比表格

### 4.4 输出

将生成的 design.md 写入 `{repo_root}/design.md`，并告知用户：
- 扫描了哪些文件
- 找到了几个核心组件
- 哪些章节因数据不足被跳过
- 建议人工核查的低置信度内容
