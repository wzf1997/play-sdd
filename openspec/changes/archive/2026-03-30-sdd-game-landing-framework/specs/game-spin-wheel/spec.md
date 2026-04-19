## ADDED Requirements

### Requirement: 转盘 React 组件
系统 SHALL 提供 `SpinWheel` React 组件，实现 `GameProps` 接口，渲染圆形转盘，扇区数量与奖品数量一致（4-8 个），用户点击"转动"后转盘旋转，减速停止后指针指向中奖扇区，弹出结果弹窗。

#### Scenario: 用户触发转盘旋转
- **WHEN** 用户点击"转动"按钮，且 remainingPlays > 0
- **THEN** 转盘以初速度高速旋转，经过至少 3 秒后减速停止于中奖扇区

#### Scenario: 旋转过程中禁止重复点击
- **WHEN** 转盘正在旋转中
- **THEN** "转动"按钮为禁用状态，防止重复触发

#### Scenario: 动画结束后调用 onResult
- **WHEN** 转盘停止旋转
- **THEN** 组件调用 props.onResult 并传入对应扇区的 Prize 对象

---

### Requirement: 转盘 BFF 路由
系统 SHALL 在 BFF 层注册 spin-wheel 游戏的三个标准路由：init / play / result，init 返回的 config 中包含 sectors 数组（每个扇区含 label、color、prizeId）。

#### Scenario: init 接口返回转盘扇区配置
- **WHEN** 请求 POST /api/game/spin-wheel/init
- **THEN** 返回 config.sectors 数组，长度在 4-8 之间

---

### Requirement: 转盘业务规则
转盘 SHALL 支持 4 到 8 个扇区，每次 play 请求服务层按权重随机返回中奖扇区索引（`winIndex`），前端按此索引计算目标旋转角度。

#### Scenario: play 接口返回 winIndex
- **WHEN** 请求 POST /api/game/spin-wheel/play
- **THEN** 返回结果中包含 prize 和 winIndex（整数，对应扇区位置）
