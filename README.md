# AIoT客户端组生活系统

部门「生活系统」：每期可同时开启**抽奖**与**下午茶评分**，首页直接呈现当前这一期。
站点名、部门名、规则、首页风格等均可在后台配置，方便其他部门复用整套系统。

三个产物：

| 产物 | 目录 | 技术 | 默认端口 |
| --- | --- | --- | --- |
| 用户前台网站 | `web/` | Vue 3 + Vite + Tailwind | 41132 |
| 管理后台 | `admin/` | Vue 3 + Vite + Tailwind | 41133 |
| 后端服务 | `server/` | Node.js + 内置 `node:sqlite` | 41131 |

数据库是本地 SQLite 文件 `server/data/data.sqlite`（每期数据持久化，便于日后汇总）。

---

## 快速开始

> 需要 Node.js 22.5+（用到内置 `node:sqlite`）。本项目用 Node 24 开发。

```bash
npm run install:all   # 安装三个子项目依赖
npm run seed          # 写入演示数据（商品库 + 三期 + 当前期）
npm run server        # 后端  http://localhost:41131
npm run web           # 前台  http://localhost:41132
npm run admin         # 后台  http://localhost:41133（默认密码 admin123）
```

---

## 核心概念

- **当前期（同时只有一期）**：后台「设为当前期」会自动下线其它期，保证不会同时上两期活动。
  前台首页 `GET /api/active` 只取这一期。
- **首页 = 当前期**：进入首页先显示统一 Loading 动画，加载完成后直接呈现当前期（抽奖 + 下午茶 + 规则都在一页内，无需导航）。没有当前期时，展示**历史期数列表**（可点击进入任意一期回看）+ 抽奖 / 评分 / 规则三个介绍模块。
- **12 种页面风格（style）**，创建期数时选择；每个 style 是一套完整主题页，但**消费完全一致的接口数据**：
  极繁主义、手绘随笔、包豪斯、终端、Material、学院风、赛博朋克、趣味几何、植物自然、蒸汽波、新拟态、复古。
  期数风格也可设为 **`随机`**：每次进入随机一种。
- **首页风格模式**（后台「系统设置」可配）：`跟随当期` / `随机` / `固定某种风格`。
- **模块开关**：系统级（影响主页与所有期数）+ 期数级，可分别关闭「抽奖」/「下午茶评分」。关闭后用户**彻底看不到**对应内容（含其规则）。最终展示 = 系统级 且 期数级 都开启。
- **后台可配置项**：部门名称、系统名称、首页风格模式、固定风格、模块开关、商品内部信息是否对用户展示、抽奖规则文案、下午茶评分规则文案。

---

## 抽奖

- 每人填姓名 + 1-9999 幸运数字，姓名与数字均防重复，开奖前互相保密。
- 算法（纯函数 `server/src/lottery.js`，模拟与开奖共用）：所有幸运数字之和 **S**，人数 **N**，余数 **R = S mod N**；按数字升序第 **R+1** 位中奖。多名额时抽出一位后移出奖池，对剩余的人重新求和取余，依次产生下一位。结果公开可复现。
- 结果页主体展示**逐步推导**（每步为什么指定这个人），下方列出全部参与者。
- 奖品支持名称 + 数量 + 可选图片；名称留空默认「一等奖、二等奖…」。
- 后台支持**模拟计算**（不落库）与**正式开奖**（落库），可撤销开奖。

## 下午茶评分

- 后台有**下午茶商品库**（全局），每一期从库里勾选若干商品录入。
- 用户对每个商品做「不推荐 / 还行 / 推荐」三档评分。
- **好评率 =（推荐 + 还行）÷ 总票数**。
- 每个浏览器对每个商品只能评一次（可把当期所有商品各评一遍）：前端用 localStorage 记录，
  后端按 `(期, 商品, 浏览器ID)` 唯一约束防止重复 fetch 刷票（重复请求返回 409）。
- 后台在每期详情可看到每个商品的本期评分统计与好评率；商品库页可看历期累计统计。
- 商品支持内部字段：**录入渠道 / 价格 / 数量**（均非必填）。默认仅后台可见；在「系统设置」里有一个**统一开关**（对所有商品生效），开启后前台商品卡才展示这些信息。
- **AI 看图录入商品**：把商品截图丢给 AI，让它识别后直接调接口批量录入。用法见 [`.claude/skills/tea-product-import/SKILL.md`](.claude/skills/tea-product-import/SKILL.md)（登录 → 可选上传图 → `POST /api/admin/products`，含 curl / Node / Python 示例）。

---

## 接口一览（精简）

公开：
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/config` | 站点/部门名、规则、首页风格模式 |
| GET | `/api/active` | 当前进行中的那一期（首页用） |
| GET | `/api/periods/:id` | 单期完整数据（开奖后含 result） |
| POST | `/api/periods/:id/entries` | 提交抽奖 `{name, number}` |
| POST | `/api/periods/:id/tea` | 评分 `{productId, level, clientId}` |

后台（请求头 `x-admin-token`）：
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/admin/login` | 登录换 token |
| GET/PUT | `/api/admin/config` | 读取 / 保存系统配置 |
| GET/POST/PUT/DELETE | `/api/admin/products[/:id]` | 下午茶商品库 |
| GET/POST/PUT/DELETE | `/api/admin/periods[/:id]` | 期数（含 productIds 录入） |
| POST | `/api/admin/periods/:id/activate` · `/deactivate` | 设为当前期 / 下线 |
| POST | `/api/admin/periods/:id/simulate` · `/draw` · `/reopen` | 模拟 / 开奖 / 撤销 |
| POST | `/api/admin/upload` | 上传图片 |

---

## 配置项（环境变量）

后端：`PORT`(41131) · `ADMIN_PASSWORD` · `ADMIN_TOKEN`。
管理密码已通过 `server/.env`（`ADMIN_PASSWORD=admin123`）配置；`npm run server` 会用 Node 的 `--env-file-if-exists=.env` 自动加载。改密码改这个文件并重启即可（`.env` 已加入 `.gitignore`，不入库）。
前端构建（前后端不同域名时）：`VITE_API_BASE`（后端地址）· `VITE_WEB_BASE`（admin 用，前台地址）。

---

## 目录结构

```
server/src/   index.js(路由) db.js(node:sqlite+配置) lottery.js(算法) seed.js(演示数据)
web/src/
  views/        Home.vue(当前期→风格渲染) Lottery.vue(/lottery/:id 直达)
  styles/       Style1..Style12（12 套完整主题页，统一契约）+ registry.js + specs/
  components/    AppLoader.vue(品牌加载动画) NoEvent.vue(无活动兜底) ClayBlobs.vue
  api.js useLottery.js usePeriodShell.js   接口与共享逻辑
admin/src/components/  Dashboard / PeriodForm / Products / Settings / ResultPreview / Login
```

新增第 13 种 style：照抄 `web/src/styles/Style1Maximalism.vue` 改样式，
在 `registry.js` 注册、`admin/src/api.js` 的 `STYLE_OPTIONS` 与后端 `STYLE_KEYS` 各加一项即可。
