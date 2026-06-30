# style4 · Terminal / CRT 终端

**Vibe**: 复古绿磷 CRT 终端、命令行、黑客感。等宽字体、扫描线、闪烁光标、ASCII/方框线框。一切像在一台老式显示器里运行。

**Tokens (Tailwind)**: `term.bg #080C08`(深黑底) `term.panel #0E150E` `term.fg #9EFFA8`(正文淡绿) `term.green #33FF66`(高亮绿) `term.dim #1FA34A`(暗绿/边框) `term.amber #FFB000`(琥珀强调) `term.red #FF5F56`(错误) `term.line #1c3a22`
**Font**: 全部 `font-mono`（JetBrains Mono）。

**CSS 工具类**: `.term-scanlines`(扫描线叠层) `.term-grid`(网格底) `.term-glow`(绿色字辉光) `.term-box`(终端边框) `.term-cursor`(闪烁光标，配 `▋`)。

**结构与风格**
- 根：`bg-term-bg text-term-fg font-mono`，叠加固定 `.term-scanlines` 与 `.term-grid` 图层（pointer-events-none）。
- 头部：像终端启动横幅。用方框线 `┌─ ┐ └ ┘` 包裹，或 `term-box`。标题前缀 `>` 或 `$`，加 `.term-cursor` 闪烁块。`config.departmentName` 显示为 `user@aiot:~$`。`.term-glow` 给标题辉光。
- 容器/卡片：`term-box`，深色 `bg-term-panel`，1px 暗绿描边，方角（`rounded-none`）。标题用 `[ SECTION ]` 或 `// comment` 风格、大写。
- 抽奖表单：输入框 `bg-black border border-term-dim text-term-green` 方角，placeholder 暗绿；前面带 `>` 提示符。按钮像命令：`[ RUN ]` / `> SUBMIT`，hover 反白（`hover:bg-term-green hover:text-term-bg`）。错误用 `term.red`，前缀 `ERROR:`。
- 结果：算法推导排成「日志输出」，每步像 `>> sum=.. n=.. mod=.. -> winner`。中奖高亮 chip 用 `bg-term-green text-term-bg`，未中 `text-term-dim`。参与者列表像 `ls` 输出，等宽对齐。
- 下午茶：每个商品像一行进程，好评率画成 ASCII 进度条（用 `█`/`░` 或一个绿色 div bar）。按钮 `[1] 不推荐 [2] 还行 [3] 推荐`。已评显示 `// rated`。
- 规则：像 `man` 手册 / `README.md`，等宽，`#` 注释绿色。
- 动效：克制，主要是光标闪烁、hover 反白。`.term-glow` 适度。
