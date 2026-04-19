# 用 AI 写代码不如让 AI 理解规格
## Spec-Driven Development 实战小册

---

## 前言

我曾经以为 AI 写代码的问题在于"提示词不够好"。

花了很长时间学习如何"正确地问 AI"，看了很多 prompt engineering 的教程，把需求描述得越来越详细。效果确实变好了一点，但始终有个毛病——代码能跑，但一旦需求延伸，整个结构就开始松动。改一处崩另一处，AI 也开始给出前后矛盾的建议。

后来我意识到问题不在提示词。问题在于 AI 一直不知道系统应该长什么样。

传统开发流程是：需求 → 代码。AI 辅助开发把这条线改成了：需求 → AI 猜代码。中间缺的不是更好的 prompt，而是一份严肃的规格文档。

这本小册记录了一套叫做 SDD（Spec-Driven Development）的开发方式。不是理论，是我用它从零搭起一个游戏落地页框架的完整过程——一天时间，67 个文件，7970 行代码，19 个测试全通过，0 个遗留 bug。

如果你经常用 AI 写代码，但总感觉"用完就乱"，这本书写给你。如果你带团队，想让 AI 协作更可控，也写给你。

---

## 第一部分：认知篇

### 第 1 章　AI 辅助开发的困境

#### 1.1 需求到代码，中间缺了什么

说个很常见的场景：你告诉 AI "帮我做一个用户登录功能"，AI 给你写了一段代码。能跑。你很满意。

然后第二天你说"这个登录要加上 Google OAuth"，AI 改了。能跑。

第三天你说"登录失败三次要锁账户"，AI 又改了。这次有点慢，因为它要重新理解整个登录流程。

第四天你说"用户登录后要记录 IP"，AI 给出的代码和第二天的 OAuth 逻辑有冲突。你来回修了半天。

这不是 AI 的问题，至少不全是。是因为整个过程里从来没有一份东西说清楚：登录模块到底应该是什么。

TDD 的人会说：先写测试。没错，但测试描述的是行为，不是结构。当系统稍微复杂一点，光靠测试驱动出来的代码往往缺乏一致的架构逻辑。

规格文档干的是另一件事：它定义接口契约、数据模型、行为约束。它是代码应该实现什么的精确描述，而不是"代码是否正确跑起来了"的验证。

#### 1.2 "AI 写了一半扔给我"的根因

大多数人用 AI 写代码的体验是：刚开始很爽，越到后期越难受。

不是因为 AI 变笨了，而是因为上下文在累积，但没有一个稳定的锚点。AI 每次生成代码，都是在当前对话历史里猜"最可能正确的实现"。如果你的对话历史里充满了临时决策和反复调整，AI 猜出来的东西自然也是一团互相打架的临时决策。

SDD 做的事情就是给这个过程加一个锚点：规格文档。

每次 AI 生成代码之前，先看规格。每次代码生成之后，拿规格对照审查。规格没变，AI 就不会突然"忘记"系统原来的设计方向。

#### 1.3 规格缺失如何让 AI 越改越错

我在这个项目里遇到过一个具体的例子，Task 7 是实现 campaign service 的业务逻辑。

AI 的初版代码里，"检查剩余次数"和"记录游戏结果"是两个独立操作，中间没有事务保护。并发场景下，用户可能在检查通过之后、记录之前又发了一个请求，结果超出限制次数仍然被允许。

如果当时没有 spec.md 里明确写着"play 接口的检查和记录必须在同一个数据库事务里"，这个 bug 很可能就混进去了。因为代码跑起来完全正常，单测也通过，只有在对照规格的时候才会发现"逻辑对，但约束没满足"。

规格不只是告诉 AI 写什么，更告诉审查者看什么。

---

### 第 2 章　SDD 的核心理念

#### 2.1 规格是唯一真相来源

SDD 的核心就一句话：**先写规格，再生成代码。规格是唯一真相来源。**

规格文档是一个 Markdown 文件，描述三件事：接口契约（这个端点接收什么、返回什么）、行为约束（边界条件、错误处理、事务要求）、数据模型（字段、类型、关系）。

代码可以重写，注释可以过时，但规格文档必须和当前系统保持一致。如果规格变了，代码要跟着变。如果代码变了但规格没变，这是一个 bug，不是一次"灵活调整"。

听起来严苛，实际上这种严苛省了很多力气。

#### 2.2 SDD vs TDD vs BDD

这三种"驱动开发"经常被混为一谈，说一下区别：

TDD（Test-Driven Development）：先写测试，测试描述代码应该有的行为，写代码让测试通过。关注的是行为验证。

BDD（Behavior-Driven Development）：用接近自然语言的方式描述用户行为场景（Given / When / Then），偏向产品和测试人员的视角。关注的是用户故事。

SDD（Spec-Driven Development）：先写规格，规格描述接口契约和架构约束，AI 按规格生成代码，生成后对照规格逐条审查。关注的是系统设计的精确性。

三者不互斥。SDD 项目里也可以有 TDD，规格文档可以指导测试用例的编写。但 SDD 解决的是更上层的问题：在代码生成之前，把系统应该是什么样的这件事说清楚。

#### 2.3 工具链全景

这套流程用到三类工具：

**SuperPowers Skills**：一系列 Claude 技能，每个技能对应一个开发阶段。`/brainstorming` 做需求脑暴，`/writing-plans` 生成实施计划，`/subagent-driven-development` 调度 AI 并行执行 Task，`/requesting-code-review` 生成审查报告。用 Slash Command 触发，每个命令背后有完整的执行逻辑。

**OpenSpec CLI**：管理规格提案生命周期的命令行工具。`/opsx:propose` 从一句需求描述生成完整的 proposal、design、多个 spec 文件和 tasks.md。`/opsx:archive` 在开发完成后把规格同步归档。规格文件是结构化的 Markdown，有固定格式，AI 和人都可以读。

**Pencil MCP**：在 `.pen` 设计文件里做 UI，生成视觉参考。UI 设计稿本身也是一种规格——它规定了组件的外观、交互和 token 系统。

#### 2.4 一次完整 SDD 的数字

说个具体的，免得整章都是概念。

这个项目是一个游戏落地页框架，支持九宫格、转盘、盲盒三种玩法，有完整的 BFF 层和后端 service。

开发时间：约 1 天（2026-03-29 到 2026-03-30）
使用的 Slash Commands：12 个
规格文件（spec.md）：8 个
实施 Tasks：15 个
新增代码：67 个文件，7970 行
测试：19/19 通过
修复的 bug：7 个（4 个在 service 层，3 个在 BFF 层）
知识入库：3 条

7 个 bug 都是在规格审查和代码审查阶段发现的，不是在联调时踩的。这是 SDD 最直接的价值体现。

---

## 第二部分：工具篇

### 第 3 章　三大工具链

#### 3.1 SuperPowers Skills

SuperPowers 是一套 Claude Skills，通过 `/` 命令触发。每个 Skill 背后是一段预写的系统提示，告诉 Claude 在这个阶段应该做什么、产出什么格式的内容、存到哪里。

它解决的问题是：AI 辅助开发里，"做什么"和"怎么做"往往混在一起，导致每次开发都要重新解释流程。SuperPowers 把流程固化到命令里，触发即执行。

几个核心命令：

`/brainstorming`：需求脑暴。输入你的想法，它会提澄清问题、给出 2-3 种方案、帮你对齐，最后生成设计文档存到 `docs/superpowers/specs/`。

`/writing-plans`：实施计划。读取 proposal 和 specs，生成带文件列表、验证步骤和依赖关系的 Task 列表。

`/subagent-driven-development`：执行实施。读取实施计划，调度多个 AI 子代理并行执行 Task，每个 Task 包含实现、规格审查、代码质量审查三个环节。

`/requesting-code-review` 和 `/receiving-code-review`：成对使用。前者生成结构化审查报告，后者评估报告里每条建议是否有效，决定是否实施。

`/finishing-a-development-branch`：收尾。运行测试，提供本地合并、PR、保留分支、丢弃四个选项。

`/capture-knowledge`：知识沉淀。从当前对话里提取踩坑经验，写入飞书多维表格。

#### 3.2 OpenSpec CLI

OpenSpec 管理的是规格文件的生命周期，有几个关键概念：

**change**：一次功能变更的容器。每个 change 是一个目录，里面有 proposal.md、design.md、tasks.md 和一组 spec.md 文件。

**specs**：接口级别的规格文件，描述一个模块的输入输出、行为约束、数据模型。和代码是 1:1 的对应关系，一个模块一个 spec。

**archive**：变更完成后，delta specs 同步到主 specs 目录，change 目录移到 archive。这样主 specs 目录始终是当前系统状态的完整描述。

`/opsx:propose` 触发后，OpenSpec 会根据你的需求描述生成整套文档。proposal.md 是"为什么做、做什么、有什么影响"；design.md 是架构决策；spec.md 是接口契约；tasks.md 是执行检查项。整套文档生成完之后，你（和 AI）都知道这件事的边界在哪里。

#### 3.3 Pencil MCP

Pencil 是一个设计工具，通过 MCP（Model Context Protocol）与 Claude 集成。在 `.pen` 文件里，Claude 可以直接创建和修改设计稿——插入组件、更新布局、生成配色方案。

为什么要在开发流程里放 UI 设计？

因为 UI 设计稿是另一种规格。它规定了组件的视觉层级、交互状态、token 系统（颜色、字体、间距）。这些如果在编码阶段才讨论，很容易在实现过程中不断变动，最后样式代码和逻辑代码搅在一起，维护成本很高。

在这个项目里，`.pen` 文件里定义了皮肤 token：

```
--color-bg: #0F0E17
--color-primary: #6C63FF
--color-accent: #FF8906
--color-text: #FFFFFE
```

这几个变量后来直接映射到 `tokens.css`，前端实现时没有任何关于"颜色用什么"的讨论。

---

### 第 4 章　Slash Commands 速查手册

#### 4.1 命令总览

按使用顺序排列：

| 命令 | 阶段 | 产出 |
|------|------|------|
| `/brainstorming` | 需求脑暴 | 设计文档 |
| Pencil MCP | UI 设计 | `.pen` 设计稿 |
| `/opsx:propose` | 规格提案 | proposal + design + 8×spec + tasks |
| `/writing-plans` | 实施计划 | Task 列表（含文件、验证、依赖） |
| `/using-git-worktrees` | 隔离分支 | 独立 worktree |
| `/subagent-driven-development` | 执行实现 | 代码 + 审查报告 |
| `/requesting-code-review` | 请求审查 | 结构化审查报告 |
| `/receiving-code-review` | 接收审查 | 修复建议评估 |
| `/browser_visible` | 浏览器验证 | 截图 + 功能确认 |
| `/finishing-a-development-branch` | 完成分支 | 合并或 PR |
| `/opsx:archive` | 归档变更 | specs 同步 + 目录归档 |
| `/capture-knowledge` | 知识沉淀 | 飞书知识库条目 |

#### 4.2 在自己的项目里配置

最小配置需要两件事：Claude Code（CLI 版本）和这套 Skills 文件放到 `~/.claude/skills/` 目录下。

OpenSpec 需要额外安装 `openspec` CLI，配置 `openspec/config.yaml` 指定 specs 目录和 changes 目录的路径。Pencil 需要 MCP 服务端运行中。

不是所有命令都必须用。如果你只想要规格提案 + 审查这两个环节，`/opsx:propose` 和 `/subagent-driven-development` 就够了。工具链的价值在于组合，但不强制全套上。

#### 4.3 三大配置坑

这是这个项目里实际踩到的，写出来省得你重踩：

**pnpm + vitest 在 production 环境跑不起来**

pnpm workspace 里如果 `NODE_ENV=production`，`devDependencies` 会被跳过安装。vitest 是 devDependency，所以测试命令直接报找不到模块。解决办法是在 CI 或本地测试脚本里明确设 `NODE_ENV=test`，或者在 workspace 根目录的 `.npmrc` 里加 `hoist-pattern[]=vitest`。

**Fastify ESM 项目 tsconfig 用 CommonJS 会报错**

Fastify v4+ 是纯 ESM 包。如果 tsconfig 里 `module` 设的是 `CommonJS`，在运行时会报 `ERR_REQUIRE_ESM`。正确配置是：

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

`NodeNext` 模式会让 TypeScript 严格区分 `.js` 和 `.mjs` 扩展名，import 路径必须写完整后缀，刚开始会有点不适应，但这是正确的。

**Vite alias 顺序问题**

如果你在 `vite.config.ts` 里定义了多个 path alias，比如 `@/games/Grid9` 和 `@/`，较具体的路径必须排在通用路径前面。Vite 的 alias 是按顺序匹配的，如果 `@/` 排在前面，所有以 `@/` 开头的路径都被它先匹配走了，具体路径永远不会被命中。

---

## 第三部分：实战篇

> 以游戏落地页框架为贯穿案例，按实际开发顺序逐章拆解。

---

### 第 5 章　需求脑暴：`/brainstorming`

#### 5.1 怎么描述需求才能让 AI 提出好问题

`/brainstorming` 启动之后，AI 不会直接给你方案，它先问你问题。这是这个命令设计上最值钱的部分。

这个项目的初始描述是：

> 我想做一个游戏落地页框架，支持九宫格、转盘、盲盒

就这一句。AI 随后问了：

- 是否需要支持多套皮肤？
- BFF 层是否需要鉴权？
- 游戏次数是否需要后端控制，还是纯前端？
- 多个游戏是否复用同一套奖品池？

这几个问题问出来，很多原本没想清楚的东西就清楚了。比如"游戏次数后端控制"这一条，如果没有这个问题，很可能在实现到一半才发现前端和后端对这件事的理解不一样。

好的描述不需要很长。重要的是把你确定的东西说清楚，把不确定的留给 AI 来问。描述越完整，AI 的澄清问题就越少也越精准；描述越模糊，浪费的往往是你回答问题的时间，而不是 AI 的。

#### 5.2 方案选型的思路

针对这个项目，AI 给出了三个方案：

**方案 A**：Monorepo + 插件注册表。所有游戏是独立包，通过统一接口注册，BFF 层和 Service 层分开部署。

**方案 B**：独立仓库 + npm 发布。每个游戏组件发包，通过 npm 版本管理。

**方案 C**：单仓库平铺。所有代码放在一个应用里，没有包的概念。

选方案 A 的原因很简单：这个框架的核心价值是"新游戏玩法只需新建一个插件"，方案 A 的插件注册表天然支持这件事，方案 C 做不到，方案 B 引入了太多发包和版本管理的成本。

这个选型过程在 brainstorming 阶段就完成了，不是在编码过程中边写边想的。后来 15 个 Task 的拆分完全基于这个架构，没有在中途推翻过一次。

#### 5.3 设计文档的格式与存储

brainstorming 完成后，AI 自动生成设计文档存到：

```
docs/superpowers/specs/2026-03-29-sdd-game-landing-framework-design.md
```

命名规则是 `YYYY-MM-DD-<topic>-design.md`。

这个文档包含：背景、方案选型、决策记录、接口初稿。它是 proposal.md 的前置文档，比 proposal 更偏"讨论过程"，proposal 更偏"最终决策"。两者配合起来，一个月后再看这个项目，能清楚地还原出"当初为什么这么做"。

---

### 第 6 章　UI 先行：Pencil MCP

#### 6.1 为什么要在编码前做 UI 设计

有个误区：UI 设计是设计师的事，开发可以先跑起来再调样式。

这在小功能上没什么问题，在稍微复杂一点的组件上会出麻烦。原因是 UI 设计不只是"好不好看"，它隐含了数据结构的决策。

比如九宫格组件，如果 UI 上是 3×3 共 9 个奖品格，那奖品数据就必须是 8 个（第 9 格是"开始"按钮），格子状态有"待机"、"高亮中"、"已中奖"三种。这些约束在 spec.md 里需要明确写出来。如果先写 spec 但没有 UI 稿，写的人可能会漏掉"第 9 格状态"这个细节，等前端实现时再改就是返工。

反过来，先做 UI，UI 稿本身就是数据结构和状态的一次视觉化描述。

#### 6.2 Token 系统的设计

在 Pencil MCP 里，颜色、字体、间距这些视觉变量被定义为 token，直接对应 CSS 变量。

这个项目的 token：

```css
/* tokens.css */
:root {
  --color-bg: #0F0E17;
  --color-primary: #6C63FF;
  --color-accent: #FF8906;
  --color-text: #FFFFFE;
  --color-surface: #1B1B2F;
  --radius-card: 12px;
  --spacing-base: 16px;
}
```

Token 不多，但覆盖了整套 UI 的视觉决策。前端实现时，所有颜色引用都走 CSS 变量，换皮肤只需要替换 `tokens.css`，不需要改组件代码。

这个设计在 skin-system 的 spec.md 里有明确约束："组件不得硬编码颜色值，必须通过 CSS 变量引用"。设计稿定义变量，规格强制约束用法，两者是配合关系。

#### 6.3 `.pen` 文件如何成为前端的"合同"

`.pen` 文件里的设计稿对应 Task 9 到 Task 14（前端部分）。每个游戏组件在设计稿里有：

- 静止状态（奖品格/扇区/盒子）
- 动画过渡帧（跑马灯路径/旋转轨迹/开箱动作）
- 中奖弹窗的布局
- 历史记录列表的样式

前端开发者拿到这份设计稿，知道自己要实现的东西长什么样，不用反复沟通"按钮多大"、"间距多少"。Pencil MCP 可以直接从设计稿导出 CSS 变量和尺寸值，基本上消除了"开发还原度"这个话题。

---

### 第 7 章　规格提案：`/opsx:propose`

#### 7.1 proposal.md 的四段结构

`/opsx:propose` 触发后，第一个生成的是 proposal.md。它有固定的四段结构：

**Why**：为什么做这件事。这个项目的 why 是：

> 移动端游戏落地页频繁上新玩法，缺乏统一骨架和复用机制。每次新玩法都要从头搭，上线周期长，质量不稳定。

**What Changes**：具体改变了什么。列出新增的能力和修改的现有行为。

**Capabilities**：这次变更带来的能力清单，每条对应一个 spec 文件：

```
- game-plugin-interface: GamePlugin 标准接口 + 注册表
- bff-game-api: init / play / result 三个标准端点
- campaign-service: SQLite 活动管理 + 业务逻辑
- game-grid9: 九宫格游戏组件
- game-spin-wheel: 转盘游戏组件
- game-blind-box: 盲盒游戏组件
- skin-system: CSS Variables 皮肤切换
- demo-landing-page: 完整参考实现
```

**Impact**：对现有系统的影响，包括风险评估。

这四段写完，任何人（包括三个月后的你）都能快速理解这次改动的完整背景。

#### 7.2 design.md 的架构决策格式

design.md 记录的是架构决策，用 D1、D2... 编号：

```
D1: 使用 pnpm workspace monorepo，原因：...，替代方案：...，风险：...
D2: BFF 和 Service 分开部署，原因：...
D3: 游戏插件通过注册表注册，原因：...
D4: 数据库使用 SQLite，原因：...
D5: 皮肤通过 CSS Variables 实现，原因：...
```

每个决策都写原因、替代方案、风险。这种格式的价值在于：当你回来问"为什么不用 PostgreSQL"，design.md 里有答案，不需要去翻 git 历史或者追问当时的人。

#### 7.3 spec.md 的接口契约模板

spec.md 是规格文件的核心，每个模块一个。格式固定，有几个必填部分：

**接口定义**（API 端点或函数签名）：

```typescript
// POST /api/game/:gameId/play
interface PlayRequest {
  userId: string;
  gameId: string;
}

interface PlayResponse {
  prize: Prize;
  remainingPlays: number;
}
```

**行为约束**（用 MUST / MUST NOT / SHOULD 描述）：

```
- 每次 play 请求 MUST 在单个数据库事务中完成检查和记录
- remainingPlays 到达 0 时 MUST 返回 403
- prize 字段 MUST NOT 为 null（无奖品时返回"谢谢参与"记录）
```

**错误处理**：

```
400 Bad Request: gameId 不存在
403 Forbidden: 剩余次数为 0
500 Internal Server Error: 数据库操作失败，包含 error_code
```

**数据模型**（如果涉及持久化）。

这套格式是固定的，AI 生成代码时按这个格式读规格，审查时也按这个格式逐条检查。

#### 7.4 tasks.md 的 78 个检查项

tasks.md 是可执行的验收标准，按模块分组，每条是一个二进制判断（通过/不通过）。

比如 campaign-service 部分的一些检查项：

```
[ ] POST /api/internal/game/:gameId/init 返回 200 + InitResponse
[ ] play 接口在数据库事务中完成
[ ] 剩余次数为 0 时 play 接口返回 403
[ ] drawPrize 使用权重随机，权重之和不为 1 时能正常兜底
[ ] Seed 数据包含 demo-grid9、demo-spin-wheel、demo-blind-box 三条活动
```

78 个检查项，覆盖 9 个模块。执行完每个 Task 之后，对应的检查项应该全部打勾。这是判断"实现是否完整"的唯一标准，不是"跑起来了"。

---

### 第 8 章　实施计划：`/writing-plans`

#### 8.1 从规格到 15 个 Task 的映射

`/writing-plans` 读取 proposal.md 和所有 spec.md，生成实施计划。

Task 的数量和粒度是关键决策。粒度太粗，一个 Task 做完时状态模糊；粒度太细，Task 之间的依赖关系变得复杂。

这个项目的 15 个 Task 是按层次划分的：

- Task 1-3：基础包（monorepo 配置 + game-core 类型和注册表）
- Task 4：跨层契约（bff-contracts，前后端共享类型）
- Task 5-7：后端 service 层（数据库 → 业务逻辑 → HTTP 服务）
- Task 8：BFF 层
- Task 9-14：前端（基础 → 三个游戏组件 → 注册 → Demo 页面）
- Task 15：联调验证

这个顺序不是随意的。底层包先完成，上层才能依赖。BFF 必须在 service 之后，因为 BFF 要代理 service 的 API。前端 Task 9 先搭基础，Task 10-12 才能在这个基础上做组件。

#### 8.2 Task 的四要素

每个 Task 的描述包含四个部分：

**文件列表**：这个 Task 会创建或修改哪些文件。精确到文件路径。

**验证步骤**：如何确认这个 Task 完成了。可以是"运行 `pnpm test --filter @paly-sdd/service`，所有测试通过"，也可以是"调用 `GET /api/internal/game/demo-grid9/result` 返回 200"。

**依赖关系**：这个 Task 必须在哪些 Task 完成后才能开始。

**spec 引用**：这个 Task 对应哪些 spec.md 文件，审查时对照这些规格。

有了这四个要素，AI 执行 Task 时不需要猜，知道做什么、怎么验、依赖谁、对照什么审查。

#### 8.3 好的实施计划模板

```markdown
## Task N: <模块名>

**目标**：<一句话描述>

**文件**：
- `apps/service/src/db.ts`（新建）
- `apps/service/src/seed.ts`（新建）

**对照规格**：
- `openspec/changes/sdd-game-landing-framework/specs/campaign-service/spec.md`

**验证步骤**：
1. `pnpm --filter @paly-sdd/service build` 无错
2. `pnpm --filter @paly-sdd/service test` 通过
3. `curl localhost:3001/health` 返回 200

**依赖**：Task 1, Task 2, Task 4（需要 bff-contracts 类型）
```

---

### 第 9 章　隔离分支：`/using-git-worktrees`

#### 9.1 worktree 比 branch 好在哪

`git branch` 切换分支时，工作目录的文件会跟着变。你在 feature 分支做到一半，切回 main 分支修一个紧急 bug，再切回来继续，通常没问题——除非你有未提交的改动，或者两个分支的结构差异太大。

`git worktree` 的方式是：给每个分支创建一个独立的工作目录。两个目录共享同一个 `.git`，但文件是隔离的。你可以同时开着 feature 分支的代码和 main 分支的代码，互不影响。

在 AI 辅助开发里，worktree 还有一个额外好处：主工作区保持干净。AI 在 feature worktree 里折腾，主工作区的代码不会被意外修改。

#### 9.2 实际操作

`/using-git-worktrees` 触发后，执行：

```bash
git worktree add .worktrees/sdd-game-landing-framework \
  -b feature/sdd-game-landing-framework
```

这会在 `.worktrees/sdd-game-landing-framework/` 创建一个新目录，里面是 `feature/sdd-game-landing-framework` 分支的工作区。

所有开发在这个目录里进行。开发完成后，`/finishing-a-development-branch` 会处理合并和清理：

```bash
git worktree remove --force .worktrees/sdd-game-landing-framework
git branch -d feature/sdd-game-landing-framework
```

---

### 第 10 章　执行实现：`/subagent-driven-development`

#### 10.1 Subagent 如何工作

`/subagent-driven-development` 读取实施计划，把每个 Task 分配给一个 AI 子代理（subagent）执行。有依赖关系的 Task 串行，没有依赖的可以并行。

每个 Task 的执行流程：

```
Implementer Subagent → 编写代码
         ↓
Spec Compliance Review → 对照 spec.md 逐条检查
         ↓
Code Quality Review → 安全/性能/健壮性检查
         ↓
Fix Subagent → 修复发现的问题
```

这个流程的关键在于：实现和审查是分开的两个步骤，而且审查是对照规格进行的，不是"感觉写得怎么样"的主观评估。

#### 10.2 Spec Compliance Review 实战案例

Task 7 完成后，Spec Compliance Review 的输出：

```
📋 Spec Compliance Review — Task 7
对照: campaign-service/spec.md

✅ POST /api/internal/game/:gameId/init — 符合
✅ POST /api/internal/game/:gameId/play — 符合（包含 db.transaction）
✅ GET /api/internal/game/:gameId/result — 符合
✅ Seed 数据包含 demo-grid9、demo-spin-wheel、demo-blind-box — 符合

结论: SPEC COMPLIANT
```

这个输出是逐条的。spec.md 里写了什么，这里就检查什么。没有"基本符合"、"大体上没问题"这种模糊表述，每条要么通过要么不通过。

#### 10.3 Code Quality Review 发现的 7 个 Bug

Code Quality Review 不对照规格，关注的是代码本身的健壮性。这个阶段发现了全项目 7 个 bug 中的全部，分两批：

**Task 7（service 层）发现 4 个：**

问题一（CRITICAL）：race condition。

```typescript
// 错误版本
const remaining = getRemainingPlays(userId, gameId);
if (remaining <= 0) throw new Error('No plays left');
recordPlay(userId, gameId, prizeId); // 不在同一个事务里
```

两个请求同时进来，都通过了 `remaining > 0` 的检查，然后都执行了 `recordPlay`，结果超出次数限制。

```typescript
// 正确版本
db.transaction(() => {
  const remaining = getRemainingPlays(userId, gameId);
  if (remaining <= 0) throw new Error('No plays left');
  recordPlay(userId, gameId, prizeId);
})();
```

问题二（HIGH）：`drawPrize` 浮点数兜底缺失。

奖品权重加起来如果因为浮点精度不等于 1，随机数可能跑到权重范围之外，导致 `drawPrize` 返回 undefined。修复是在循环结束后加兜底：

```typescript
let selected = rows[rows.length - 1]; // 兜底：总是返回最后一条
for (const row of rows) {
  if (rand < row.weight) { selected = row; break; }
  rand -= row.weight;
}
```

问题三（MEDIUM）：`getDb()` 在数据库未初始化时返回 null 而不是抛出错误，导致调用方的空指针异常难以定位。

问题四（MEDIUM）：`initDb` 和 seed 操作在 Fastify 插件生命周期外执行，服务关闭时可能留下未完成的 I/O。

**BFF 层发现 3 个（代码审查阶段）：**

问题一：auth middleware 缺少 `return`。

```typescript
// 错误版本
if (!token) {
  reply.send({ error: 'Unauthorized' }); // 没有 return
}
// 继续执行到 handler
```

问题二：`userId` 直接做字符串插值拼接到 URL，存在注入风险。改用 `URLSearchParams`。

问题三：没有全局 error handler，service 不可用时前端收到的是裸 500，没有可读的错误信息。

这 7 个 bug，有 4 个在单测里不会触发，需要特定条件。正是因为有 Code Quality Review 这个环节，才在联调前全部修掉。

#### 10.4 CRITICAL / HIGH / MEDIUM 的处理原则

CRITICAL 和 HIGH 必须修，不可以"先留着"。CRITICAL 是功能正确性问题，HIGH 是在边界条件下会出错的问题。这两类问题留到生产环境，修复成本是开发阶段的若干倍。

MEDIUM 评估后决定。上面的问题三和问题四都是 MEDIUM，但影响面清楚，修复成本低，所以也一并修了。

有些 MEDIUM 的建议是过度设计，比如"给每个函数加超时控制"——这是合理建议，但在当前阶段加进去会增加复杂度而没有对应的收益，可以留到后续迭代。

---

### 第 11 章　代码审查

#### 11.1 `/requesting-code-review`

这个命令在主要功能完成后执行，生成一份结构化的审查报告。审查维度包括：

- 架构一致性：代码结构是否符合 design.md 的决策
- 安全性：常见漏洞（注入、越权、未处理的错误）
- 测试覆盖：关键路径是否有测试
- 规格合规：实现是否和 spec.md 一致

报告按严重程度分级，每条包含：问题描述、出现位置、修复建议。

#### 11.2 `/receiving-code-review`：不是所有建议都要听

`/receiving-code-review` 接收审查报告后，不是无脑执行里面的所有建议。每条建议都要评估：

- 这个问题真实存在，还是误报？
- 修复带来的收益是否超过修复成本？
- 修复会不会引入新的复杂度？

BFF 层这次审查出 3 个问题，都是真实有效的，全部修复。但有时候审查会建议"加入请求日志"、"增加监控埋点"——这些建议本身没错，但不是这个阶段该做的事，可以记录下来留到后续。

区分"有效建议"和"合理但超范围建议"是 `/receiving-code-review` 的核心价值，防止审查结果变成无限膨胀的需求列表。

#### 11.3 BFF 层的三个高危问题解析

前面提到的三个 BFF 问题，说一下为什么它们是"高危"：

**auth middleware 缺少 return**：这种 bug 在 code review 里是最容易被漏掉的，因为代码看起来完全正确——`reply.send` 确实发出了响应。但 Fastify 的 middleware 如果没有 `return`，执行流会继续，handler 里又发了一次响应，触发 "Reply already sent" 错误。在压测下这个错误会集中暴发。

**userId 字符串插值**：当前测试数据里 userId 都是规则字符串，没问题。但如果有人传入 `../../admin` 或者带特殊字符的 userId，URL 拼接出来的结果就不是预期的了。用 `URLSearchParams` 做 encoding 是一行改动，但不做这个改动，安全审计时必然会标出来。

**没有全局 error handler**：service 不可用时，BFF 会把 500 直接返给前端。前端没有足够的信息判断是 BFF 的问题还是 service 的问题，排查时间会很长。加一个 `app.setErrorHandler()` 统一返回带 `error_code` 的 503，前端和后端排查的起点就清晰多了。

---

### 第 12 章　验证、合并、归档、知识沉淀

#### 12.1 浏览器验证

`/browser_visible` 打开一个有头浏览器（你能看到的那种，不是 headless），访问 `http://localhost:5173`。

验证的是"三个游戏实际跑起来是否符合设计稿"。这个阶段的问题通常是：动画节奏不对、奖品文字截断、移动端响应式布局错位。

这类问题在单测里测不出来，因为单测不渲染 UI。需要人眼看一遍。

验证流程：
1. 后台启动三个服务（service 3001、BFF 3000、web 5173）
2. 打开浏览器，切换三个 Tab，各跑一次抽奖
3. 检查中奖历史记录是否正确显示
4. 截图存档

#### 12.2 19/19 通过的背后

测试通过是合并的前置条件，但"测试通过"不等于"功能正确"。

这个项目的 19 个测试分布在：

```
packages/game-core    5 个  ← 注册表功能
apps/bff              2 个  ← 代理转发
apps/service          8 个  ← 业务逻辑（含事务、权重随机、边界条件）
apps/web              4 个  ← 组件渲染和交互
```

service 层 8 个测试覆盖了上面说的那几个 bug 场景，包括：并发请求、权重边界、剩余次数为 0 时的 403、seed 数据完整性。

测试是规格的另一种表达形式，spec.md 里的行为约束直接对应到测试用例。这样的测试才有意义，不是为了凑覆盖率数字。

#### 12.3 `/opsx:archive`：规格同步与归档

开发完成后，change 目录里的 delta specs 需要同步到主 specs 目录：

```bash
cp -r openspec/changes/sdd-game-landing-framework/specs/* openspec/specs/
```

然后把整个 change 目录移到 archive：

```bash
mv openspec/changes/sdd-game-landing-framework \
   openspec/changes/archive/2026-03-30-sdd-game-landing-framework/
```

归档之后，`openspec/specs/` 里是当前系统的完整规格，所有 8 个模块都有对应的 spec.md。下次做新 feature 时，`/opsx:propose` 会在这个基础上生成新的 delta specs，只描述变化的部分。

#### 12.4 `/capture-knowledge`：踩坑变成资产

开发过程里踩的坑，如果只留在对话历史里，下次换个项目还会踩。`/capture-knowledge` 从当前会话里提取高置信度的踩坑，写入飞书多维表格（或其他知识库）。

这个项目入库了 3 条：

**条目 1**：pnpm workspace + vitest 的 NODE_ENV 问题。标签：pnpm、nodejs、monorepo、vitest。置信度：高。

**条目 2**：Fastify ESM 项目 tsconfig 必须用 NodeNext。标签：fastify、typescript、esm、nodejs、tsconfig。置信度：高。

**条目 3**：Vite alias 更具体的路径必须排在通用路径前面。标签：vite、react、typescript、alias、monorepo。置信度：高。

三条都是"踩了之后必须修"的问题，不是"最佳实践"级别的建议。入库之后，下次遇到类似报错，搜标签就能找到解决方案，不需要重新推导一遍。

知识沉淀不是锦上添花，是让 SDD 流程的边际成本持续下降的核心机制。每做一个项目，知识库里多几条有效记录，下一个项目就少踩几个坑。

---

*（第四部分：进阶篇 / 第五部分：附录 待续）*
