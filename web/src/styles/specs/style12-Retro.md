# style12 · Retro / 70 年代复古

**Vibe**: 1970 年代复古海报。芥末黄、焦橙、牛油果绿、复古青、奶油底、棕色。圆润粗壮字体、放射太阳光、横条纹、复古徽章。温暖、怀旧、有质感。

**Tokens (Tailwind)**: `retro.bg #F3E2C0`(奶油底) `retro.panel #EAD2A0` `retro.ink #3A2A1A`(深棕字) `retro.orange #CB6843`(焦橙) `retro.mustard #E3A857`(芥末黄) `retro.avocado #6B8E23`(牛油果绿) `retro.teal #2A7E78`(复古青) `retro.brown #5A3E2B`
**Font**: 标题 `font-righteous`（圆润复古），正文 `font-poppins`。

**CSS 工具类**: `.retro-shadow`(棕色硬阴影) `.retro-rays`(放射太阳光锥形渐变) `.retro-stripes`(四色横条纹) `.animate-retro-rays`(放射光慢转)。

**结构与风格**
- 根：`bg-retro-bg text-retro-ink font-poppins`。可在头部背后放一个 `.retro-rays` + `.animate-retro-rays` 的放射太阳（低透明度），底部放一条 `.retro-stripes` 横带。
- 头部：复古海报感。`font-righteous` 大标题，关键词可叠 `retro.orange`/`retro.avocado` 色块。期数做成复古圆形徽章（双圈 + 大写环绕字）。站点名 `tracking-[0.25em] uppercase text-retro-brown`。
- 卡片：`bg-retro-panel rounded-[24px] border-2 border-retro-brown retro-shadow`。栏目标题圆润粗体，配复古下划波浪线或小徽章。色块轮换 mustard/orange/avocado/teal。
- 抽奖表单：输入框 `bg-retro-bg rounded-xl border-2 border-retro-brown`，focus 边框变橙。按钮：`rounded-full bg-retro-orange text-retro-bg font-righteous retro-shadow`，hover 微移 `active:translate-y-0.5 active:shadow-none`。错误焦橙提示。
- 结果：中奖名单像复古奖牌（圆徽 + 横条）。算法推导每步一张复古卡，公式圆润字，中奖 chip 实心 mustard/orange + 棕边，未中描边。参与者排成复古标签墙（四色轮换）。
- 下午茶：商品卡复古，好评率用 `.retro-stripes` 风或纯橙圆角进度条，数字粗圆。三个复古按钮（不推荐=orange 描边、还行=teal、推荐=avocado 实心）。已评 `★ 已评` 徽章。
- 规则：像复古说明册，圆润标题 + 两段，配复古项目符号 ◆/●。
- 动效：放射光慢转、hover 抬升/微移，整体温暖复古。
