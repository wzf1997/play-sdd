# Scan Patterns Reference

## 目录导航
- [Token 文件扫描清单](#token-文件扫描清单)
- [组件文件扫描清单](#组件文件扫描清单)
- [值提取正则模式](#值提取正则模式)
- [Tailwind Utility 映射表](#tailwind-utility-映射表)
- [项目类型识别](#项目类型识别)

---

## Token 文件扫描清单

按优先级顺序扫描，找到即读取：

### 配置文件（最高优先级）
```
tailwind.config.js / tailwind.config.ts / tailwind.config.mjs
theme.ts / theme.js / theme.json
tokens.ts / tokens.js / design-tokens.ts / design-tokens.json
variables.css / variables.scss / _variables.scss
colors.ts / colors.js / palette.ts
constants.ts / constants.js（过滤含颜色/尺寸的部分）
styles/globals.css / styles/global.css / src/index.css / src/styles.css
```

### CSS/SCSS 变量文件
```
**/_variables.*
**/variables.*
**/_tokens.*
**/tokens.*
**/_colors.*
**/colors.*
**/theme.*
```

### 框架特定
| 框架 | 额外扫描文件 |
|------|------------|
| Next.js | `styles/globals.css`、`app/globals.css` |
| Vue | `src/assets/styles/`、`src/styles/`、`*.vue` 中的 `<style>` 块 |
| Svelte | `src/app.css`、`*.svelte` 中的 `<style>` 块 |
| Nuxt | `assets/css/`、`assets/scss/` |
| Vite vanilla | `src/style.css`、`public/*.css` |

---

## 组件文件扫描清单

```
src/components/**/*.tsx
src/components/**/*.jsx
src/components/**/*.vue
src/components/**/*.svelte
components/**/*.tsx
components/**/*.jsx
app/components/**/*.tsx
pages/**/*.tsx（提取复用的内联样式）
```

**优先级规则**：
- 被 import 次数 ≥ 3 的组件视为核心组件，重点分析
- 文件名含 `Button`/`Card`/`Badge`/`Tag`/`Modal`/`Header`/`Nav` 的优先处理
- `ui/` 或 `common/` 目录下的组件优先于页面级组件

---

## 值提取正则模式

### CSS 变量声明
```regex
--[\w-]+\s*:\s*[^;]+;
```
示例匹配：`--brand-color: #FF6B9D;`、`--spacing-base: 8px;`

### 颜色值
```regex
# hex6
#[0-9A-Fa-f]{6}\b
# hex3
#[0-9A-Fa-f]{3}\b
# rgba
rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)
# hsl
hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%(?:\s*,\s*[\d.]+)?\s*\)
```

### 尺寸值（提取数字+单位）
```regex
\b(\d+(?:\.\d+)?)(px|rem|em|vh|vw|%)\b
```

### 内联 style 对象（React/JSX）
```regex
style=\{\{([^}]+)\}\}
```
或多行：
```regex
style=\{(\{[\s\S]*?\})\}
```

### JS/TS 中的颜色常量
```regex
(?:color|Color|bg|background|fill|stroke|border)\w*\s*[=:]\s*["']([#\w]+)["']
```

### 字体大小（fontSize / font-size）
```regex
fontSize[:\s]+["']?(\d+(?:\.\d+)?)(px|rem)?["']?
font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem)
```

### 圆角（borderRadius / border-radius）
```regex
borderRadius[:\s]+["']?(\d+(?:\.\d+)?)(px|%|rem)?["']?
border-radius\s*:\s*([^;]+);
```

### box-shadow / filter: drop-shadow
```regex
(?:box-shadow|boxShadow)\s*[=:]\s*["']?([^"';\n]+)["']?
filter\s*[=:]\s*["']?drop-shadow\([^)]+\)["']?
```

### transition / animation
```regex
transition\s*[=:]\s*["']?([^"';\n]+)["']?
animation\s*[=:]\s*["']?([^"';\n]+)["']?
```

### @media 断点
```regex
@media[^{]+\((?:min|max)-width\s*:\s*(\d+)(px|em|rem)\)
```

---

## Tailwind Utility 映射表

### 文字大小
| class | 值 |
|-------|----|
| text-xs | 12px / 0.75rem |
| text-sm | 14px / 0.875rem |
| text-base | 16px / 1rem |
| text-lg | 18px / 1.125rem |
| text-xl | 20px / 1.25rem |
| text-2xl | 24px / 1.5rem |
| text-3xl | 30px / 1.875rem |

### 圆角
| class | 值 |
|-------|----|
| rounded-none | 0 |
| rounded-sm | 2px |
| rounded | 4px |
| rounded-md | 6px |
| rounded-lg | 8px |
| rounded-xl | 12px |
| rounded-2xl | 16px |
| rounded-3xl | 24px |
| rounded-full | 9999px（胶囊） |

### 间距（p/m/gap，1单位=4px）
| class | 值 |
|-------|----|
| 1 | 4px |
| 2 | 8px |
| 3 | 12px |
| 4 | 16px |
| 5 | 20px |
| 6 | 24px |
| 8 | 32px |
| 10 | 40px |
| 12 | 48px |
| 14 | 56px |
| 16 | 64px |

### 字重
| class | 值 |
|-------|----|
| font-normal | 400 |
| font-medium | 500 |
| font-semibold | 600 |
| font-bold | 700 |

### 常用断点（默认 Tailwind）
| prefix | min-width |
|--------|-----------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

---

## 项目类型识别

扫描根目录，判断技术栈，影响组件扫描策略：

| 文件存在 | 判断为 |
|---------|-------|
| `next.config.*` | Next.js（App Router 或 Pages） |
| `nuxt.config.*` | Nuxt.js |
| `vite.config.*` + `*.vue` | Vue + Vite |
| `svelte.config.*` | SvelteKit |
| `package.json` 含 `"react"` | React（CRA/Vite） |
| 仅 `*.html` + `*.css` | 原生 HTML/CSS |

### Tailwind 检测
若根目录存在 `tailwind.config.*`，切换到 Tailwind 模式：
- 优先从 `theme.extend` 读取自定义 token
- 用 Tailwind 映射表翻译 class → 具体值
- 统计高频 utility 组合推断间距体系

### CSS-in-JS 检测
若组件中存在 `styled-components`、`emotion`、`stitches` 等引用：
- 扫描 template literal 中的 CSS 属性
- 提取 `css()` 调用中的样式对象
