# style5 · Material Design 3

**Vibe**: Google Material You。干净、克制、有层级。柔和阴影(elevation)、圆角、填充按钮、FAB、芯片、清晰排版。专业而友好。

**Tokens (Tailwind)**: `md.bg #F3EDF7` `md.surface #FFFBFE` `md.surfaceVar #E7E0EC` `md.primary #6750A4` `md.onPrimary #FFFFFF` `md.secondary #625B71` `md.tertiary #7D5260` `md.error #B3261E` `md.outline #79747E` `md.onSurface #1C1B1F`
**Font**: `font-roboto`。

**CSS 工具类**: `.md-elev-1/2/3`(标准 elevation 阴影) `.md-bar`(顶部不定进度条，配 `relative overflow-hidden h-1 bg-md-surfaceVar`)。

**结构与风格**
- 根：`bg-md-bg text-md-onSurface font-roboto`。整洁留白，无花哨纹理。
- 头部：顶部 App Bar 风格条（`bg-md-surface md-elev-2`），左侧站点名，右侧期数 chip。下方大标题 `text-4xl font-normal`（Material 偏中等字重），副标题 `text-md-secondary`。
- 卡片：`bg-md-surface rounded-3xl md-elev-1`（hover `md-elev-2`），圆角 `rounded-[24px]`~`rounded-[28px]`，内边距充足。次级容器用 `bg-md-surfaceVar` tonal。
- 抽奖表单：用「填充式输入框」(filled text field)：`bg-md-surfaceVar rounded-t-lg border-b-2 border-md-outline focus:border-md-primary`，上方浮动标签风格的小标签。按钮：填充按钮 `bg-md-primary text-md-onPrimary rounded-full h-12 px-6 md-elev-1`，hover 微亮。错误用 `text-md-error` + 下边框变红。
- 结果：中奖用 tonal 卡片 `bg-md-primary/10`，奖品名 chip。算法步骤用 `bg-md-surfaceVar rounded-2xl`，公式 monospace，中奖 chip `bg-md-primary text-white rounded-full`，其余 outlined chip `border border-md-outline`。参与者用 Material chips。
- 下午茶：商品用 Material card（图片在上或左），好评率用 `LinearProgress` 风格条（`h-2 rounded-full bg-md-surfaceVar` 里 `bg-md-primary`）。三个按钮：outlined/tonal 按钮（`不推荐` outlined、`还行` tonal、`推荐` filled）。已评显示带勾的 assist chip。
- 规则：用两张 outlined card 或一个 Material 列表，圆角，图标(emoji)放在 leading。
- 动效：`transition` 平滑 200-300ms，hover 抬升 elevation。可在加载区用 `.md-bar`。
