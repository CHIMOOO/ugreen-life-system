# style9 · Botanical / 植物自然

**Vibe**: 植物园、手绘叶片、有机自然、温柔。森绿/鼠尾草/陶土/花粉色，柔和阴影，叶子与枝条 SVG 装饰，衬线优雅。宁静、清新、有呼吸感。

**Tokens (Tailwind)**: `bot.bg #F2F6EC` `bot.ink #2E3D2C` `bot.leaf #3E6B47`(叶绿) `bot.sage #8FA98A`(鼠尾草) `bot.terracotta #C97B5A`(陶土) `bot.bloom #D98DA3`(花) `bot.cream #EFE9D6`
**Font**: 标题 `font-cormorant`（优雅衬线），正文 `font-poppins`。

**CSS 工具类**: `.bot-paper`(淡纹理底) `.bot-card`(柔和投影) `.animate-bot-sway`(叶片摇摆，transform-origin bottom)。

**结构与风格**
- 根：`.bot-paper text-bot-ink`。四周散布手绘叶子/枝条（内联 SVG 或 emoji 🌿🍃🌱），`.animate-bot-sway` 轻摇，低透明度。
- 头部：居中。`font-cormorant` 大标题（可斜体），两侧各一枝叶子 SVG。站点名小字 `tracking-widest text-bot-leaf uppercase`。期数做成一个圆形「叶徽」。
- 卡片：`bg-bot-cream/70 rounded-[28px] bot-card` 柔和，叶绿细描边可选。栏目标题衬线 + 一个小叶子图标。整体大量留白、圆润。
- 抽奖表单：输入框 `bg-white rounded-2xl border border-bot-sage focus:border-bot-leaf`，标签衬线。按钮：`rounded-full bg-bot-leaf text-bot-cream`，hover 加深；次要按钮陶土描边。错误用陶土色。
- 结果：中奖名单像「花名册」，卡片配花/叶角饰（bloom 色）。算法推导每步一张奶油卡，公式衬线数字，中奖 chip `bg-bot-leaf text-bot-cream rounded-full`，未中 chip `border border-bot-sage`。参与者排成藤蔓点列。
- 下午茶：商品卡像植物图鉴，好评率用 `bg-bot-leaf` 柔和圆角条（可做成「灌满的叶绿」），数字陶土色。三个按钮圆润自然色（不推荐=terracotta 描边、还行=sage、推荐=leaf 实心）。已评显示 `🌿 已评`。
- 规则：像自然笔记，衬线正文，两段配小叶子项目符号。
- 动效：叶片轻摇、hover 柔和上浮，整体安静优雅。
