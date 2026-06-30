# style11 · Neumorphism / 新拟态

**Vibe**: 柔和单色、同底色挤出/凹陷的双向柔影。极简、安静、高级。元素像从同一块软塑料上「鼓出」或「按进」。几乎无色彩，仅一个强调色。

**Tokens (Tailwind)**: `neu.bg #E0E5EC`(统一底色，关键) `neu.fg #52606D`(正文) `neu.muted #8A97A6` `neu.accent #5B7CFA`(唯一强调蓝) `neu.light #FFFFFF` `neu.dark #A3B1C6`
**Font**: `font-poppins`。

**CSS 工具类（核心）**: `.neu-raised`(凸起) `.neu-raised-sm`(小凸起) `.neu-pressed`(凹陷/内阴影) `.neu-flat`(轻浮)。所有卡片/按钮/输入都用这几个，背景必须保持 `bg-neu-bg`。

**结构与风格**
- 根：`bg-neu-bg text-neu-fg font-poppins`。整页同一底色，靠柔影塑造层级，留白充足。
- 头部：标题 `text-neu-fg font-semibold`，可放在一个大 `.neu-flat` 区域里；期数做成一个 `.neu-raised` 圆形徽标。站点名 `text-neu-muted tracking-widest`。强调字用 `text-neu-accent`。
- 卡片：`.neu-raised rounded-[28px]`，圆润。栏目标题低调，图标放进一个 `.neu-pressed` 的小圆/方凹槽里。
- 抽奖表单：输入框用 `.neu-pressed rounded-2xl`（凹进去），无边框，focus 时强调色文字/细发光。按钮：`.neu-raised rounded-2xl text-neu-accent font-semibold`，hover 略凸，`active` 切到 `.neu-pressed`（按下去的感觉）。错误用柔和红字。
- 结果：中奖名单每人一个 `.neu-raised` 药丸。算法推导每步一个 `.neu-flat` 卡，公式低调；中奖 chip 用 `.neu-pressed` + `text-neu-accent` 高亮（凹陷强调），未中用 `.neu-raised-sm`。参与者一堆 `.neu-flat` 小药丸。
- 下午茶：商品卡 `.neu-raised`，好评率用一个 `.neu-pressed` 凹槽轨道里嵌 `bg-neu-accent` 凸条。三个按钮 `.neu-raised`，点中后 `.neu-pressed`。已评显示凹陷的 `✓ 已评`。
- 规则：两个 `.neu-flat` 区块，低对比、安静。
- 动效：仅 raised↔pressed 的柔和切换，hover/active 200ms。**不要**加硬边框或彩色阴影，保持单色柔影。
