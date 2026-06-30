# style7 · Cyberpunk / 赛博朋克

**Vibe**: 霓虹夜城、故障艺术、HUD 界面。暗紫黑底 + 霓虹粉/青/黄，发光描边，斜切角(clip-path)，网格透视，扫描/闪烁。高能、未来、危险。

**Tokens (Tailwind)**: `cyber.bg #070014` `cyber.panel #0E0524` `cyber.pink #FF2A6D` `cyber.cyan #05D9E8` `cyber.yellow #F9F002` `cyber.purple #9D00FF` `cyber.green #00FF9F` `cyber.fg #E6E1FF`
**Font**: 标题 `font-orbitron`，正文 `font-dm` 或 `font-mono`。

**CSS 工具类**: `.cyber-grid`(透视网格底) `.cyber-glow-pink/.cyber-glow-cyan`(霓虹盒辉光) `.cyber-text-pink/.cyber-text-cyan`(霓虹字辉光) `.cyber-clip`(右下斜切角) `.animate-cyber-flicker`(偶发闪烁)。

**结构与风格**
- 根：`bg-cyber-bg text-cyber-fg`，固定叠加 `.cyber-grid` 图层 + 顶部/底部霓虹渐隐光。
- 头部：HUD 横幅。期数像 `// SYS.PERIOD_03`，站点名 `font-orbitron` 大字配 `.cyber-text-pink`（可加 `.animate-cyber-flicker`）。状态像徽标 `[ LIVE ]`/`[ DRAWN ]` 霓虹边。
- 卡片：`bg-cyber-panel/80 backdrop-blur` + 霓虹边（`border border-cyber-pink/60` + `.cyber-glow-pink`），`.cyber-clip` 斜切角。标题 `font-orbitron uppercase`，前缀 `▰`/`>`。不同卡片轮换粉/青/紫边色。
- 抽奖表单：输入框 `bg-black/60 border border-cyber-cyan text-cyber-cyan` 斜角，focus 加 `.cyber-glow-cyan`。按钮：`bg-cyber-pink text-black font-orbitron uppercase .cyber-clip`，hover 加辉光放大。错误 `text-cyber-pink` 前缀 `! ERR`。
- 结果：中奖名单像通缉/中签名牌，霓虹边 + glitch 名字。算法推导像终端 HUD 日志，公式 monospace 青色，中奖 chip `bg-cyber-yellow text-black`，未中 `text-cyber-fg/50 border-cyber-purple/40`。参与者像数据网格。
- 下午茶：商品卡像菜单 HUD，好评率用霓虹进度条（青→粉渐变），数字辉光。按钮霓虹三连。已评 `[ VOTED ]` 青色辉光。
- 规则：像系统手册面板，`> RULES.md`，等宽，要点前缀 `▹`。
- 动效：霓虹辉光、`.animate-cyber-flicker` 偶发、hover scale+glow。注意保持文字可读（正文不要纯霓虹色大段）。
