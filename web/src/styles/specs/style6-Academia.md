# style6 · Dark Academia / 学院风

**Vibe**: 旧书、羊皮纸、图书馆、古典学术。衬线字体、首字下沉、装饰性边框、酒红与森绿与烫金、规整的栏目像一页古籍。

**Tokens (Tailwind)**: `aca.paper #F3E9D2`(羊皮纸底) `aca.panel #EADDBF` `aca.ink #2A2118`(墨色) `aca.brown #5B4636` `aca.burgundy #7B2D26`(酒红) `aca.forest #33402F`(森绿) `aca.gold #B08D57`(烫金)
**Font**: 标题 `font-playfair`，正文 `font-garamond`。

**CSS 工具类**: `.aca-paper`(羊皮纸纹理底) `.aca-frame`(古典双层描边) `.aca-rule`(细分隔线) `.aca-dropcap`(首字下沉，加在段落上)。

**结构与风格**
- 根：`.aca-paper text-aca-ink font-garamond`。
- 头部：像扉页。居中，`font-playfair` 大标题（可斜体/小型大写），上下各一条 `.aca-rule` 细线 + 居中的烫金小花饰（用 `❦`/`✦`/`§`）。`config.departmentName` 作为「出版社/系所」小字大写 `tracking-[0.3em] text-aca-gold`。
- 卡片：`bg-aca-panel` + `.aca-frame`（双层墨线描边），方正。栏目标题 `font-playfair` 配下方 `.aca-rule`。可用罗马数字编号 I. II. III.。
- 抽奖表单：输入框像填空横线——`bg-transparent border-b-2 border-aca-ink font-garamond`，标签衬线斜体。按钮：`bg-aca-burgundy text-aca-paper` 或描边按钮 `border-2 border-aca-ink`，方正，大写 `tracking-widest`，hover 反色。
- 结果：中奖名单像「获奖名录」，烫金边框 `border-aca-gold`。算法推导像论证段落，第一段用 `.aca-dropcap`；每步用 `.aca-rule` 分隔，公式可用小型大写或斜体；中奖人名加 `text-aca-burgundy font-semibold` 下划线。参与者列表排成两栏点列（像目录），用 `·` 或 `…` 引导线。
- 下午茶：每款商品像图鉴条目，衬线标题，好评率用细长 `bg-aca-forest` 进度条配古典刻度。按钮描边古朴。已评盖个「✓ 已品鉴」印章感标签 `text-aca-burgundy`。
- 规则：像书页正文，`.aca-dropcap` 首字下沉，两段（抽奖/评分）之间 `.aca-rule`。
- 动效：极克制，hover 仅轻微色变/下划线。
