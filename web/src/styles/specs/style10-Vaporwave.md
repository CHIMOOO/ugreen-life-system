# style10 · Vaporwave / 蒸汽波

**Vibe**: 80/90 年代复古未来、合成器浪潮。日落渐变、透视霓虹网格地平线、铬金属/故障文字、棕榈与方块太阳、粉紫青配色。怀旧、梦幻、迷幻。

**Tokens (Tailwind)**: `vapor.bg #1A0033` `vapor.panel #2A0A4A` `vapor.pink #FF71CE` `vapor.cyan #01CDFE` `vapor.purple #B967FF` `vapor.green #05FFA1` `vapor.yellow #FFFB96` `vapor.fg #FFE3FF`
**Font**: 标题 `font-orbitron` 或 `font-monoton`(超复古，仅大标题)，正文 `font-outfit`。

**CSS 工具类**: `.vapor-bg`(日落渐变底) `.vapor-sun`(方块太阳渐变) `.vapor-grid`(透视网格，已含 perspective rotateX) `.vapor-chrome`(铬渐变文字) `.vapor-glow`(霓虹盒辉光)。

**结构与风格**
- 根：`.vapor-bg text-vapor-fg`。底部固定一层 `.vapor-grid`（青色透视网格地平线）；可在头部放一个 `.vapor-sun` 大圆（用横条 mask 或叠几条暗线做「百叶」太阳）。散落 ▲ 棕榈/方块装饰。
- 头部：超大 `.vapor-chrome` 或 `font-monoton` 标题（可中英混排，如「LUCKY 抽奖」）。站点名 `tracking-[0.3em] text-vapor-cyan`。期数像 `VOL.03`。整体居中、对称、怀旧。
- 卡片：`bg-vapor-panel/70 backdrop-blur border border-vapor-pink/50 .vapor-glow rounded-2xl`。标题 `font-orbitron uppercase` 渐变。轮换粉/青/紫边。
- 抽奖表单：输入框 `bg-black/40 border border-vapor-cyan text-vapor-cyan`，focus 加 `.vapor-glow`。按钮：`bg-gradient-to-r from-vapor-pink to-vapor-purple text-white font-orbitron uppercase .vapor-glow rounded-full`，hover 放大辉光。错误粉色。
- 结果：中奖名单像复古奖杯牌，铬字。算法推导每步一张霓虹卡，公式 monospace 青色，中奖 chip `bg-vapor-yellow text-vapor-bg`，未中 `text-vapor-fg/50`。参与者像网格上的发光节点。
- 下午茶：商品卡复古，好评率用粉→青霓虹渐变进度条，数字 `.vapor-chrome`。三个霓虹按钮。已评 `▣ 已评` 发光。
- 规则：像复古杂志栏，`A E S T H E T I C` 间距感标题，正文可读。
- 动效：辉光、缓慢渐变流动、hover scale。保持正文可读。
