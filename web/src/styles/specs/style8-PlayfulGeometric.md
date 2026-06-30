# style8 · Playful Geometric / 趣味几何

**Vibe**: 明亮活泼、童趣、扁平几何。大色块、圆润形状、硬阴影、漂浮的圆/三角/波浪、糖果色。开心、友好、有弹性。

**Tokens (Tailwind)**: `geo.bg #FFFCF5`(奶油底) `geo.ink #2D2A32` `geo.coral #FF6B6B` `geo.teal #2FB5AC` `geo.yellow #FFC93C` `geo.blue #5B8DEF` `geo.purple #9B5DE5`
**Font**: `font-fredoka`（圆润）标题，`font-poppins` 正文。

**CSS 工具类**: `.geo-shadow`/`.geo-shadow-lg`(硬色块阴影) `.animate-geo-spin`(慢转) `.animate-geo-pop`(上下弹+转)。

**结构与风格**
- 根：`bg-geo-bg text-geo-ink font-poppins`。背景散布绝对定位的几何装饰：大圆、圆角方块、三角(`clip-triangle`)、波浪、加号，用 5 个糖果色轮换、`.animate-geo-pop`/`.animate-geo-spin` 漂浮（pointer-events-none，aria-hidden）。
- 头部：超大圆润标题 `font-fredoka font-bold text-5xl sm:text-7xl`，关键词套不同色块高亮（`bg-geo-yellow rounded-2xl px-2 -rotate-2`）。期数做成一个旋转的圆形徽标。站点名做成药丸标签。
- 卡片：白底 `rounded-[28px] border-[3px] border-geo-ink geo-shadow`，hover `-translate-y-1`。每张卡片左上角放一个小几何角标（圆/方/三角，糖果色轮换）。
- 抽奖表单：输入框 `rounded-2xl border-[3px] border-geo-ink` 厚边圆润，focus 边框变彩色。按钮：`rounded-full bg-geo-coral text-white border-[3px] border-geo-ink geo-shadow font-fredoka`，hover `-translate-y-0.5 active:translate-y-1 active:shadow-none`（按压感）。错误用 coral 提示条。
- 结果：中奖名单做成彩色奖牌泡泡。算法推导每步一张彩色圆角卡，公式大号圆润字，中奖 chip 实心糖果色 + 黑边 + 放大，未中 chip 白底黑边。参与者做成一堆彩色小药丸。
- 下午茶：商品卡圆润，好评率用粗圆角进度条（糖果色），数字大而圆。三个按钮做成圆润彩色（不推荐=coral 描边、还行=blue、推荐=teal 实心）。已评显示 `✓ 已评` 圆形徽章。
- 规则：两块大圆角彩色卡，配大 emoji 角标。
- 动效：弹跳、轻转、hover 抬升，整体欢快有弹性。
