# 架构指南（给后续 AI 修改用）

本系统**全部由 AI 迭代修改**。改动前先读本文，按这里的契约与约定动手，能越改越稳、不丢有效信息。
改完后，如果引入了新的契约/约定/坑，**回写本文对应小节**。

## 0. 一句话定位

「AIoT客户端组生活系统」：一个部门内部的**抽奖 + 下午茶评分 + 账单**平台。
三个产物 + 同一个本地 SQLite：
- `server/`：Node + Express + 内置 `node:sqlite`，提供接口、上传，生产时还同源伺服前端。
- `web/`：用户前台（Vue3 + Vite + Tailwind）。
- `admin/`：管理后台（Vue3 + Vite + Tailwind）。

端口：server **41131**、web **41132**、admin **41133**。一键起：`npm run all`。

## 1. 核心概念（务必先懂）

- **当前期（is_active）**：全局至多一期 `is_active=1`。首页 `GET /api/active` 只取它。后台「设为当前期」会先把所有期清零再置 1（`activatePeriod`）。
- **首页 = 当前期的 style 主题页**。`web/src/views/Home.vue` 按 `config.homeStyleMode`（follow/random/fixed）解析出一个 style 组件来渲染当前期；无当前期 → `NoEvent.vue`（历史期数 + 模块介绍 + 规则）。
- **12 套 style + 随机**：`web/src/styles/StyleN*.vue`。每套是一整页主题，但**消费完全一致的数据契约**（见 §3）。期数 style 还可取 `'random'`，由 `registry.js` 的 `resolveStyle` 解析成随机一种。
- **随机主题缓存（TTL）**：`random_theme_ttl`（分钟，后台「首页与风格」可设，0=关闭）。开启后随机不再每次进入都换，而是由**服务端**选定一个并锁定 TTL 分钟，期间所有用户/所有刷新看到同一个「当前随机主题」，过期后下次拉配置自动换。实现：`db.js#effectiveRandomStyle()` 惰性判定（在 `getConfig` 里按需重选，无定时器），锁定值写入运行时 setting `random_theme_current`/`random_theme_picked_at`，随 `getConfig().randomThemeCurrent` 下发；前端 `registry.js#setPinnedRandomStyle` 记住它，令 `randomStyleKey()`（首页随机模式 + 某期 style='random'，Home/Lottery 都走）返回锁定值。改随机解析处务必仍走 `randomStyleKey()`，否则绕过缓存。**坑/约定**：① `GET /api/config`（公开）会「按需重随并落库」——即读接口带写副作用（write-on-read），但每个 TTL 窗口至多写一次、量与请求数无关；若日后给 `/api/config` 前置 CDN/缓存需知晓。② TTL 上限 0..10080 分钟的夹取在**读边界** `randomThemeTtlMinutes()` 做（对直接改库/导入备份也成立），不只在 PUT。③ PUT 里**仅当 TTL 值变化**才清空锁定（`random_theme_current`/`picked_at`），使「关闭再开启/改时长」从新一轮随机开始，又不会因保存其它无关设置而误重随。
- **模块开关 = 系统级 且 期数级**。系统级在 settings：`lottery_module_enabled` / `tea_module_enabled` / `review_module_enabled` / `bill_module_enabled` / `period_bill_show`。期数级是 periods 行上的 `lottery_enabled` / `tea_enabled` / `review_enabled` / `bill_show`。后端对**公开端**做遮蔽（mask），对**后台端**返回真实值（见 §4）。
- **评价 / 建议模块**：每期可收集「对本期的评价」+「对下一期的建议」（`reviews` 表，`kind`=review|suggestion）。内容必填、姓名可选（留空=匿名，前台显示「匿名」）。它是一面**公开评价墙**：前台展示本期全部留言 + 顶部提交表单；后台「评价管理」标签跨期查看/按期过滤/删除。开关同上（系统级 `review_module_enabled` + 期数级 `review_enabled`，**期数级默认关**）。提交也记指纹（`kind='review'`，且把指纹按 `review_id` **关联到这条留言**）——后台「评价管理」每条留言直接展示对应指纹、「用户管理」也能看到具名用户的评价与其指纹（**匿名留言 name=null 也能追溯到设备**，靠 review_id 而非姓名）。
- **各页「🔄 刷新数据」**：前台 Home/Lottery/BillLedger 各有一个悬浮刷新按钮（`web/src/components/RefreshFab.vue`，固定左下），点一下重拉当前页数据、免 F5（把 onMounted 的拉取逻辑抽成 `load()` 复用）。后台 Dashboard 顶栏也有「🔄 刷新」：期数标签重拉列表+详情，其余数据型标签靠 `:key` 重挂载刷新（系统设置标签不给刷新，避免丢未保存编辑）。

## 2. 数据模型（`server/src/db.js`）

- `settings(key, value)` — 全部系统配置。默认值见 `DEFAULT_SETTINGS`，新增配置就加一行默认值 + 在 `getConfig()` 暴露 + 在 `index.js` 的 `PUT /api/admin/config` 接收。**运行时 setting**（不写进 `DEFAULT_SETTINGS`、不经 `getConfig` 下发）：`admin_password_hash`（改密后的管理凭据哈希，见 §4）、`random_theme_current`/`random_theme_picked_at`（随机主题锁定）。
- `periods` — 期数。关键列：`style`、`lottery_enabled`、`tea_enabled`、`review_enabled`、`is_active`、`status`(open|drawn)、`prizes`(JSON)、`result`(JSON)、`tea_rating_hours`、`tea_close_at`、`bill_show`(inherit|on|off)、`invalid_names`(JSON)。
- `entries` — 抽奖参与者。`UNIQUE(period_id,name)` 与 `UNIQUE(period_id,number)` 双防重复。
- `tea_products` — **全局**下午茶商品库。`price` 是**预设价**；`channel/qty` 是内部字段。
- `period_products` — 期↔商品关联，`amount` 是**本期实际金额**（默认套商品 `price`）。
- `tea_ratings` — 评分。`UNIQUE(period_id,product_id,client_id)` 防同浏览器重复刷。
- `reviews` — 评价/建议留言。`kind`(review|suggestion)、`name`(可空=匿名)、`content`(必填)、`period_id`。**不去重**（允许同一人多次留言）。删期时一并删（`index.js` DELETE period）。已在 `BACKUP_TABLES`（导出/导入）与 `seed.js` 的 DELETE 清单里。提交时会记一条 `fingerprints`(kind=review) 并以 `review_id` 反向关联（见指纹小节）；删留言目前不联删指纹（留痕），指纹行会成为悬挂引用，无碍。
- `bills` — 账单流水。`kind`(income|expense)、`amount`、`period_id`(可空)。
- `fingerprints` — 指纹留痕。每次抽奖/评分/撤销/**评价**记一条。`kind`=lottery|rating|cancel|review、`fp`=摘要文本、`ip`/`ua`=服务端补的、`details`=全量信号 JSON（形状见 §4 指纹小节）、`review_id`=kind=review 时关联的评价 id（供后台反查，匿名留言也能追溯）。**旧库**里 `details` 可能为 null（增强前的历史行，`fp` 是 `[object Object]`）——后台已按「早期记录」友好降级，勿当 bug。

**DB 路径**：默认 `server/data/data.sqlite`，可用环境变量 `CHOUJIANG_DB` 覆盖（跑第二实例/隔离测试时用，别和正在运行的实例共用同一库文件互相干扰）。

**迁移**：旧库加列用 `addColumnIfMissing(table, col, decl)`（幂等，基于 PRAGMA）。改 schema 时**同时**改 CREATE TABLE（新库）和加一行 `addColumnIfMissing`（旧库）。

## 3. style 数据契约（12 套组件统一，**不可破坏**）

每个 `StyleN*.vue`：
```
props: period, config, submitting, submitState, votedProducts, ratingBusy, nameStatus, reviewState
emits: submit({name,number}), rate({productId, level}), name-input, cancel, submit-review({kind,name,content})
computed: isDrawn, lotteryOn(=period.lotteryEnabled), teaOn(=period.teaEnabled && tea.products.length),
          reviewOn(=period.reviewEnabled), reviews(=period.reviews.items),
          joined, showForm, result, prizeGroups, skipped(被判无效而顺延的人)
五大板块: ① 头部 ② 抽奖(表单/已参与/结果含算法推导+无效顺延块) ③ 评价墙 ④ 下午茶(本期账单+多商品评分) ⑤ 规则
```
共享工具在 `web/src/useLottery.js`：`useLotteryForm / stepExplain / winnersByPrize / skippedInvalids / TEA_LEVELS / teaExtraText / REVIEW_KINDS / reviewErrorText / relativeTime / getClientId / 本地参与&评分记录`。
表单/评分/**评价提交**逻辑收敛在 `web/src/usePeriodShell.js`（Home 与 Lottery 复用，含 `onSubmitReview`/`reviewState`）；派生状态在 `web/src/useStyleShell.js`（含 `skipped`/`reviewOn`/`reviews`/`doSubmitReview`）。

**评价墙 = 共享主题组件 `web/src/components/ReviewSection.vue`**（做法同 `ConfirmSubmitDialog`：靠 `theme` 传各 style 的类名，默认用 currentColor + accent 中性样式）。**位置契约**：在抽奖 `<section v-if="lotteryOn">` 内，插在「表单/已参与」与「开奖结果」之间（结果块的 `v-else-if` 已改成独立 `v-if`）——**未开奖时在抽奖下方、开奖后在结果上方**；再在该 section 之后放一个 `v-if="reviewOn && !lotteryOn"` 的兜底块（抽奖关但评价开时单独成块）。给 12 套统一改动仍用 workflow 扇出、以 `Style1` 为参考。

**规则可见性**特例：规则区按**系统级**开关 `config.lotteryModuleEnabled/teaModuleEnabled` 显示（即使当期未开该模块，首页仍按后台设置展示规则）；而抽奖/下午茶**板块本身**按 `lotteryOn/teaOn`（期数级，已被后端 mask 含系统级）显示。

**规则用 Markdown 渲染**：`config.rulesLottery/rulesTea` 是 **Markdown 文本**（后台「系统设置 → 规则文案」可编辑，默认见 `db.js` `DEFAULT_SETTINGS`——抽奖规则含「匿名(工号)/实名」两种参与方式）。前端统一用 `web/src/components/Markdown.vue`（极简渲染：`#` 标题 / `**加粗**` / `-` 与 `1.` 列表 / 空行分段，先转义 HTML）在 12 套 style + `NoEvent` + `ConfirmSubmitDialog` 里渲染。**别再用 `whitespace-pre-line` 直插纯文本**。`seed.js` 会把规则重置为 DEFAULT（reseed 即刷新）；现有库改默认后需在后台点「恢复服务器默认」才生效。

**奖品图锁定 16:9**：12 套 style 里奖品图（列表 `z.image` + 中奖名单 `g.image`）都用 `aspect-video`（开奖前后一致）；**下午茶商品图仍是 `h-44`**（别混改）。生成图尺寸/构图见 `image-spec` skill（已明确**允许品牌 logo**）。

**无效顺延展示**：`useLottery.js#skippedInvalids(result)` 从 `result.ranking/winners` 推出「被判无效、落在中奖区间因而被跳过、由后一位递补」的人（落在名额填满之后的无效者不算）；`useStyleShell` 暴露 `skipped`，12 套 style 结果区据此在中奖名单与算法推导之间展示「⚖ 无效顺延」块。

### 给 12 套 style 做同一处改动 → 用 workflow 扇出
先在 `Style1Maximalism.vue`（参考实现）改好，再用 Workflow 对 `Style2..Style12` 并行做同样的小改动，prompt 里贴清「改哪里、参考 Style1、只改这一处」。本仓库已这样做过多次（占位提示、规则可见性、本期账单块等）。

## 4. 后端契约要点（`server/src/index.js`）

- `serializePeriod(row, {withResult, withEntries, withReviews, adminView, mask})`：
  - `mask=true`（公开端 /api/active、/api/periods[/:id]）→ 用系统开关遮蔽 `lotteryEnabled/teaEnabled/reviewEnabled`，并据此决定 `tea`/评价 items 是否下发。
  - `mask=false`（后台端）→ 返回期数真实开关；`adminView=true` 让商品带内部字段 + `amount`。
  - `bill` 始终下发 `{show, items, total}`；商品内部字段（渠道/价格/数量）按三个系统开关 `tea_show_channel/tea_show_price/tea_show_qty` **逐字段**决定是否在公开端出现（`extra`，可单独只开某一项）。
  - `reviews` 始终下发 `{enabled, items}`：`enabled` 是遮蔽后的开关；`items` **仅在 `withReviews` 详情视图**（/api/active、/api/periods/:id、后台详情）且（公开端已开启 / 后台端）时带上，**列表端 /api/periods 保持轻量**（items 为空）。
- 评价接口：公开 `POST /api/periods/:id/reviews`（body `{kind,name?,content}`，校验内容必填≤1000、限流靠内容长度而非频次，落库并回 `{ok, review}`，同时记指纹 `kind='review'` 并把 **`review.id` 作为 `recordFingerprint` 第 6 个参数 `reviewId`** 落到 `fingerprints.review_id`）；后台 `GET /api/admin/reviews[?periodId=]`（跨期/按期，带期标题，**每条 item 内联 `fingerprint`**：按 `review_id` LEFT JOIN 反查，无则 null）、`DELETE /api/admin/reviews/:id`。期数写入（create/update）多收 `reviewEnabled`（`readPeriodInput` + INSERT/UPDATE 的 `review_enabled` 列）。**列表端指纹是「瘦身版」**（`db.js#slimFpDetails` 剥掉体积最大的 FPJS 原始 components，只留规范化关键信号 + 服务端信号，避免跨期列表把每条 10~40KB 全量指纹都塞进来）；要看真·原始全量信号去「用户管理」看具名用户（`userDetail` 按用户返回完整 details）。
- 开奖算法 `server/src/lottery.js#computeResult(entries, prizes, invalid)`：先算**全量抽取排名** `ranking`，再按奖品顺序分配、**跳过无效者顺延**。`steps`/`winners` 与无 invalid 时完全兼容。改算法务必保持 `result` 字段形状（前端 12 套都依赖）。
- 图片上传 `POST /api/admin/upload`：multer 内存接收 → `server/src/imagePipeline.js#toWebp` 用 **@jsquash（纯 WASM，无原生依赖）** 把 jpeg/png/webp 统一转成体积最小的 **WebP**，质量由系统设置 `image_quality`（1-100，默认 90，后台「图片上传」可改）决定；gif/svg 等不支持的格式或转码失败时**按原文件落盘**（不丢图）。坑：Node 的 `fetch` 不支持 `file://`，而 @jsquash 默认用 fetch 加载随包 `.wasm`——`imagePipeline.js` 顶部打了个 `file://` fetch 补丁兜住，**不要删**；否则上传转码会以 `fetch failed` 失败（会自动回退原图，但就没压缩了）。
- **指纹**：核心引擎是开源库 **`@fingerprintjs/fingerprintjs`（v5，MIT，纯前端随包打包，无 CDN）**，在 `web/src/fingerprint.js` 里 `load({monitoring:false}).get()` 拿 `{visitorId, confidence, components}`——`visitorId` 作为稳定「指纹 id」，`components`（40+ 项：canvas/audio/字体/WebGL/屏幕/时区…）即后台「原始全量信号」。再叠一层高熵 UA-Client-Hints（`navigator.userAgentData.getHighEntropyValues`，FPJS 不采、需安全上下文）。API 仍是 `initFingerprint()`（进页面预热）+ `getFingerprint()`（提交时取，2.5s 超时兜底）。落库形状：`recordFingerprint` 存 `details = {id, summary, client:<compute().details>, server:<serverSignals>}`；`client` 里既有规范化字段（`visitorId/confidence/fpVersion/webgl.renderer/screen/timezone/fonts[]/canvasHash…` 供后台「关键信号一览」）又有原始 `fingerprintjs` components。**80KB 上限**：正常 FPJS 全量在 10~40KB，超限（多半恶意灌大）只留摘要+服务端信号。后台读取/展示指纹的逻辑（`fpView`/`kindMeta`/`isLegacy`/`fmtTime`）已收敛到共享模块 **`admin/src/fpView.js`**，`UserManagement.vue`（用户详情弹窗）与 `Reviews.vue`（评价管理，每条留言的对应指纹）都 import 它——消费 `details.client.*`，改指纹落库形状要同步这里。`kindMeta` 覆盖 lottery/rating/cancel/**review**（review 显示「评价」）。四种动作各带 `period_id`；review 另带 `review_id`（见评价接口小节）。
- 鉴权：后台凭据 = `SHA-256('aiot-life::' + ADMIN_PASSWORD)`（盐 `ADMIN_SALT` 前后端写死一致）。前端登录前在本地算好哈希再发（`admin/src/api.js` 的 `hashPassword`，用 `js-sha256` 纯 JS 实现——HTTP 非安全上下文也能算，不依赖只在 HTTPS/localhost 才有的 `crypto.subtle`），**明文密码不出网**；该哈希即后续所有 `/api/admin/*` 的请求头 `x-admin-token`，后端 `adminAuth` 用 `crypto.timingSafeEqual` 恒定时比对。登录 `POST /api/admin/login` 收这个哈希（也兼容明文密码作回退，便于脚本）。改 `ADMIN_PASSWORD`（`server/.env`，启动带 `--env-file-if-exists=.env`）即换**默认**凭据；旧的 `ADMIN_TOKEN` 环境变量已废弃。改盐或哈希算法务必前后端同步改。**后台可改密码**：`POST /api/admin/change-password`（验证旧密码后把新哈希写进 settings 的 `admin_password_hash`；前台在「系统设置 → 修改管理员密码」）。此后**当前凭据以库中哈希为准**——`currentAdminToken()`：有合法 `admin_password_hash` 就用它，否则回退 `ADMIN_PASSWORD` 派生哈希；`login`/`adminAuth` 每次实时读取，故改密后旧 token 立即失效、环境变量密码也失效。导入旧备份会覆盖 settings、可能清掉该行 → 自动回退环境变量密码（相当于一条找回途径）。

## 5. 约定

- **UI 中文**；金额 `¥`；好评率 =（推荐+还行）÷ 总票数。
- **提交 commit 不写 AI 信息**，按功能迭代提交（`feat: …`）。`git config user` 用项目作者。
- 验证优先级：`npm run build`（web+admin）→ 后端接口 `node` 脚本打 41131 → 必要时 DOM 检查。本环境**预览截图工具不稳定/常超时**，用 `preview_eval` 读 DOM / `preview_inspect` 替代。
- 改完**重置演示数据**：`npm --prefix server run seed`（注意 seed 会 `DELETE` 所有表，**包括 bills**——新增表要在 seed 的 DELETE 清单里加上，否则反复 seed 会累积脏数据）。

## 6. 常见坑

- 起服务前先杀掉 41131/41132/41133 的旧进程，否则改了代码还在跑旧代码、或 rm 数据库报 busy。
- Windows 下 `git` 会提示 LF→CRLF，忽略即可。
- `curl` 在 Git Bash 里发中文 body 可能乱码；用 Node `fetch` 写测试脚本更稳。
- 生产同源：admin 构建要 `VITE_BASE=/admin/`、`VITE_WEB_BASE=`（空，让「打开页面」走相对路径）。详见 Dockerfile / DEPLOY.md。
- **本地在 Git Bash 里设 `VITE_BASE=/admin/` 会被 MSYS 路径转换成 `C:/Program Files/Git/admin/`**（凡以 `/` 开头、像路径的参数/环境值都会被改写），构建出的 index.html 资源指向 `/Program Files/Git/admin/assets/...` → 后台白屏。用 **PowerShell** 设该变量（`$env:VITE_BASE='/admin/'`）或加 `MSYS_NO_PATHCONV=1`。Linux/Docker 构建不受影响。

## 7. 扩展速查

- 加配置项：`db.js`(默认值+getConfig) → `index.js`(PUT config) → `admin/Settings.vue` → 用到的前端组件。
- 加 style：抄 `Style1` 改样式 → `registry.js` 注册 + 标签 → 后端 `STYLE_KEYS`（db.js）+ admin `STYLE_OPTIONS`(api.js) + Dashboard `STYLE_LABEL`。
- 加 AI 技能：放 `.claude/skills/<name>/SKILL.md`。已有 `tea-product-import`（看图→调接口录入下午茶商品）、`image-spec`（奖品图/商品图的尺寸·宽高比·格式规范，供出图参考）。技能里凡涉及后端地址一律用 `BASE` 占位、**不要写死 localhost**（部署后地址因环境而异，执行前向用户确认并 `GET $BASE/api/health` 验证）。
