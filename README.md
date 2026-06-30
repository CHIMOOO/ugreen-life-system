# 生活系统 · 抽奖 + 下午茶评分 + 账单

一个**部门内部用**的轻量活动平台：每期可同时开启**抽奖**与**下午茶评分**，配一套**账单**记账，首页直接呈现当前这一期。
站点名、部门名、规则文案、首页风格、各模块开关都在后台可配，**换个部门改几个字就能复用整套系统**。

> 无需账号体系——用户只填姓名即可参与；后台一个密码进入。适合小团队内部娱乐，不做严格统计。

三个产物，同一个本地 SQLite：

| 产物 | 目录 | 技术 | 默认端口 |
| --- | --- | --- | --- |
| 用户前台 | `web/` | Vue 3 + Vite + Tailwind | 41132 |
| 管理后台 | `admin/` | Vue 3 + Vite + Tailwind | 41133 |
| 后端服务 | `server/` | Node.js + 内置 `node:sqlite` | 41131 |

数据库是本地文件 `server/data/data.sqlite`，无需额外安装数据库。

---

## 快速上手

> 需要 **Node.js 22.5+**（用到内置 `node:sqlite`）。开发用 Node 24。

```bash
npm run install:all   # 安装三个子项目依赖
npm run seed          # 写入演示数据（商品库 + 三期活动 + 当前期 + 账单）
npm run all           # 一键同时启动 后端(41131)/前台(41132)/后台(41133)
```

打开 **http://localhost:41132** 看前台，**http://localhost:41133** 进后台（默认密码 `admin123`）。

也可分开启动：`npm run server` / `npm run web` / `npm run admin`。

> - 改后台密码：编辑 `server/.env` 的 `ADMIN_PASSWORD=` 后重启（`.env` 不入库）。
> - 生产部署：见 [DEPLOY.md](DEPLOY.md)，Docker 单镜像同源伺服前台/后台/接口，一条 `docker compose up -d --build`。
> - 二次开发先读 [CLAUDE.md](CLAUDE.md)，里面是架构契约与扩展速查。

---

## 功能讲解

### 🎲 抽奖
- 每人填**姓名 + 1-9999 幸运数字**，姓名与数字均防重复，开奖前互相保密。
- **算法公开可复现**（纯函数 `server/src/lottery.js`）：所有幸运数字之和 **S**，人数 **N**，余数 **R = S mod N**；把人按数字升序排，第 **R+1** 位中奖。多名额时抽出一位移出奖池，对剩下的人重新求和取余，依次产生下一位。结果页主体展示**逐步推导**。
- **一个名字只能提交一次**：输入框边打字边查重（接口防抖），已提交则给出**「撤销抽奖」**按钮——撤销时**不回显号码**（防止凭姓名套取他人数字），并记录指纹便于追溯。
- 摇不出数字？点输入框旁的**🎲 骰子按钮**，翻滚动效后随机一个数字。
- 奖品支持名称 + 数量 + 大图；后台可**模拟计算**（不落库）与**正式开奖**（落库，可撤销）。开奖后还能**判定某人无效，名次自动顺延**（第二名递补第一名）。

### ☕ 下午茶评分
- 后台维护**全局商品库**，每期从库里勾选若干商品录入；商品卡为大图，点击可**全屏放大预览**。
- 用户对每个商品做**「不推荐 / 还行 / 推荐」**三档评分；**好评率 =（推荐 + 还行）÷ 总票数**。
- 每个浏览器对每个商品**只能评一次**（localStorage + 后端唯一约束双保险，重复请求返回 409）。
- 商品有内部字段**渠道 / 价格 / 数量**，默认仅后台可见。是否对用户展示**逐字段独立勾选**——可以只公开价格、藏起渠道和数量。
- **AI 看图录入**：把商品截图丢给 AI 即可批量录入，用法见 [`.claude/skills/tea-product-import/SKILL.md`](.claude/skills/tea-product-import/SKILL.md)。

### 💰 账单
- 总账单流水（收入/支出/**结余**/**垫付**），每期可挂「本期账单」，金额可由商品实际金额**自动计算**或手填。
- 只要开启账单模块，前台首页就常驻**账单入口**（路由 `/bill`），**不依赖是否有当前期**。
- 流水**分页，10 条/页**，前后台一致。

### 👤 用户管理（无需账号）
- 用户首次抽奖后，姓名被记进浏览器，之后自动回填；同时聚合进后台**用户库**。
- 每次提交/评分/撤销都**自动采集指纹**留痕。后台用户管理可按姓名查看：
  - **抽奖模块**——每一次抽奖的期数与数字；
  - **评分模块**——对每个商品的评分次数；
  - **指纹模块**——每次提交的指纹历史（便于追溯异常）。

### 🎨 页面风格 & 模块开关
- **12 套整页主题**（极繁/手绘/包豪斯/终端/Material/学院/赛博朋克/趣味几何/植物/蒸汽波/新拟态/复古）+ **随机**，创建期数时选择。
- **首页风格模式**：跟随当期 / 随机 / 固定某种。
- **模块开关 = 系统级 且 期数级**：抽奖 / 下午茶 / 账单都能分别开关，关闭后用户彻底看不到（含其规则）。

### 🛟 数据备份
- 后台一键**导出**全部数据为 JSON（设置/期数/商品/账单/用户/指纹…），一键**导入**整包覆盖恢复——换机迁移、留存档都靠它。

---

## 操作手册（后台）

后台入口 http://localhost:41133，菜单大致对应这几件事：

1. **期数（Dashboard / 期数表单）**：新建一期 → 选风格、开/关抽奖与下午茶、录入下午茶商品并填本期金额、配奖品 → **设为当前期**。开奖：先「模拟计算」核对，再「正式开奖」；如有人作弊可「判定无效」让名次顺延。
2. **下午茶商品库（Products）**：维护全局商品（名称/图/描述/渠道/价格/数量），供各期勾选。
3. **账单（Bills）**：记录收入/支出流水，可关联某一期；查看结余与垫付。
4. **用户管理（UserManagement）**：按姓名查看其抽奖数字、评分次数、指纹历史。
5. **系统设置（Settings）**——已**按用途分层**，从上到下：
   - **基础**：部门名、系统名；
   - **首页风格**：风格模式 / 固定风格；
   - **模块开关**：抽奖 / 下午茶 / 账单（系统级）；
   - **商品展示**：渠道 / 价格 / 数量是否对用户公开（逐项勾选）；
   - **趣味**：姓名输入框占位提示；
   - **规则**：抽奖 / 下午茶规则文案，**可一键恢复服务器默认**；
   - **备份**：导出 / 导入全部数据。

   保存按钮**粘顶**，改哪一层都能随手保存。

---

## 接口一览

**公开端**（前台用）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/config` · `/api/config/defaults` | 站点配置 / 规则默认文案 |
| GET | `/api/active` | 当前进行中的那一期（首页） |
| GET | `/api/periods` · `/api/periods/:id` | 历史期数列表 / 单期完整数据 |
| POST | `/api/periods/:id/entries` | 提交抽奖 `{name, number, fingerprint}` |
| GET | `/api/periods/:id/check?name=` | 姓名是否已提交（**不返回号码**） |
| POST | `/api/periods/:id/cancel` | 撤销抽奖 `{name, fingerprint}`（不回显号码，留痕） |
| POST | `/api/periods/:id/tea` | 评分 `{productId, level, clientId, name}` |
| GET | `/api/bills` | 总账单流水（公开） |

**后台端**（请求头 `x-admin-token`）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/admin/login` | 登录换 token |
| GET/PUT | `/api/admin/config` | 读取 / 保存系统配置 |
| …CRUD | `/api/admin/products[/:id]` | 下午茶商品库 |
| …CRUD | `/api/admin/periods[/:id]` | 期数（含 productIds 录入） |
| POST | `/api/admin/periods/:id/activate` · `/deactivate` | 设为当前期 / 下线 |
| POST | `/api/admin/periods/:id/simulate` · `/draw` · `/reopen` · `/invalid` | 模拟 / 开奖 / 撤销 / 判无效顺延 |
| …CRUD | `/api/admin/bills[/:id]` | 账单流水 |
| GET | `/api/admin/users[/:name]` | 用户列表 / 单用户详情（抽奖/评分/指纹） |
| GET/POST | `/api/admin/export` · `/import` | 数据备份导出 / 导入 |
| POST | `/api/admin/upload` | 上传图片 |

---

## 配置项（环境变量）

后端：`PORT`(41131) · `ADMIN_PASSWORD` · `ADMIN_TOKEN`。管理密码走 `server/.env`，`npm run server` 用 `--env-file-if-exists=.env` 自动加载。
前端（前后端不同域名时）：`VITE_API_BASE`（后端地址）· `VITE_WEB_BASE`（admin 用，前台地址）。

---

## 目录结构

```
server/src/   index.js(路由) db.js(node:sqlite+配置+备份+用户) lottery.js(算法) seed.js(演示数据)
web/src/
  views/        Home.vue(当前期→风格渲染) Lottery.vue(/lottery/:id) BillLedger.vue(/bill 账单页)
  styles/       Style1..Style12（12 套整页主题，统一数据契约）+ registry.js + specs/
  components/    AppLoader / NoEvent / DiceButton(摇号动效) / ImageZoomOverlay(放大预览) / ClayBlobs
  api.js useLottery.js usePeriodShell.js   接口与共享逻辑
admin/src/components/  Dashboard / PeriodForm / Products / Bills / UserManagement / Settings / ResultPreview / Login
```

> 新增第 13 种风格：照抄 `web/src/styles/Style1Maximalism.vue`，在 `registry.js`、`admin/src/api.js` 的 `STYLE_OPTIONS`、后端 `STYLE_KEYS` 各加一项。更多扩展点见 [CLAUDE.md](CLAUDE.md)。

---

## License

MIT
