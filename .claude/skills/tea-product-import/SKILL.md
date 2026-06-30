---
name: tea-product-import
description: 从下午茶商品的截图中识别商品信息（名称/描述/录入渠道/价格/数量），并通过 HTTP 接口批量录入到「生活系统」的下午茶商品库。当用户发来一张商品/菜单/订单截图并希望把里面的商品录入后台时使用。
---

# 下午茶商品录入（看图 → 调接口）

把用户给的**商品截图**（菜单、外卖订单、价目表、采购清单等）识别成结构化商品，
然后调用后台 HTTP 接口逐个录入到「下午茶商品库」。录入后这些商品出现在管理后台「商品库」，
管理员可在某一期里勾选它们用于评分。

## 0. 你需要先确认的两件事

1. **后端地址 BASE**：默认 `http://localhost:41131`（端口可被部署方改动，必要时向用户确认）。
2. **管理密码**：即后端环境变量 `ADMIN_PASSWORD`（本地在 `server/.env`）。
   出于安全，本文不写死密码——执行时从用户处获取，或让用户自己执行登录那一步。

## 1. 从截图提取字段

对截图里**每一个商品**，尽量识别下面字段（除 `name` 外都可缺省，识别不到就留空）：

| 字段 | 含义 | 来源举例 |
| --- | --- | --- |
| `name`（必填）| 商品名称 | 「提拉米苏」「海盐芝士奶盖」 |
| `desc` | 描述/备注 | 规格、口味、配料 |
| `channel` | 录入渠道 | 截图里的店名/平台：「美团」「楼下甜品店」「肯德基」 |
| `price` | 价格 | 「¥32」「32元」→ 取数字或原文，字段为文本不强校验 |
| `qty` | 数量 | 「x10」「10份」→ 取整数 |

提取后整理成数组，例如：

```json
[
  { "name": "提拉米苏", "desc": "马斯卡彭+可可粉", "channel": "楼下甜品店", "price": "32", "qty": 10 },
  { "name": "海盐芝士奶盖", "desc": "海盐芝士+冷萃", "channel": "美团", "price": "26", "qty": 12 }
]
```

> `channel/price/qty` 是**内部字段**，默认不对用户展示；是否对用户展示由后台「系统设置 → 下午茶商品的内部信息对用户开放展示」这个统一开关决定，与录入无关。

## 2. 登录拿 token

所有 `/api/admin/*` 接口都要带请求头 `x-admin-token: <token>`。先登录换 token：

```bash
curl -s -X POST "$BASE/api/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"password":"<管理密码>"}'
# 成功 -> {"token":"xxxxxxxx"}；密码错 -> 401 {"error":"bad_password"}
```

把返回的 `token` 用于后续请求头。

## 3.（可选）上传商品图片

商品图片**非必填**。如果你能从截图里裁出单个商品的图，或用户另外给了图片文件，可先上传拿到 URL：

```bash
curl -s -X POST "$BASE/api/admin/upload" \
  -H "x-admin-token: $TOKEN" \
  -F "file=@/path/to/product.png"
# -> {"url":"/uploads/1699999999-123456.png"}
```

把返回的 `url` 作为下一步的 `image` 字段；不传图就省略 `image`。
（接口为 multipart 表单，字段名必须是 `file`，限 5MB。）

## 4. 录入商品

逐个 POST 到商品库。`name` 必填，其余可选：

```bash
curl -s -X POST "$BASE/api/admin/products" \
  -H "x-admin-token: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
        "name": "提拉米苏",
        "desc": "马斯卡彭+可可粉",
        "channel": "楼下甜品店",
        "price": "32",
        "qty": 10,
        "image": "/uploads/1699999999-123456.png"
      }'
# 成功 -> {"id":1,"name":"提拉米苏","image":...,"desc":...,"channel":...,"price":...,"qty":...,"stats":{...}}
# 缺名字 -> 400 {"error":"name_required"}
```

字段说明：
- `name` **string，必填**。
- `desc` string，可选。
- `channel` string，可选（录入渠道）。
- `price` string，可选（允许 "32" 或 "¥32/份" 这类写法）。
- `qty` integer，可选（数量；非整数会被忽略存为空）。
- `image` string，可选（来自第 3 步的 `url`）。

## 5. 批量录入脚本示例

### Node.js（Node 18+，内置 fetch）

```js
const BASE = process.env.BASE || 'http://localhost:41131';
const PASSWORD = process.env.ADMIN_PASSWORD; // 运行时通过环境变量传入，勿写死

const products = [
  { name: '提拉米苏', desc: '马斯卡彭+可可粉', channel: '楼下甜品店', price: '32', qty: 10 },
  { name: '海盐芝士奶盖', desc: '海盐芝士+冷萃', channel: '美团', price: '26', qty: 12 },
];

const login = await (await fetch(`${BASE}/api/admin/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})).json();
const token = login.token;

for (const p of products) {
  const res = await fetch(`${BASE}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(p),
  });
  console.log(p.name, res.status, await res.json());
}
```

### Python（requests）

```python
import os, requests
BASE = os.environ.get('BASE', 'http://localhost:41131')
PASSWORD = os.environ['ADMIN_PASSWORD']  # 运行时传入

token = requests.post(f'{BASE}/api/admin/login', json={'password': PASSWORD}).json()['token']
H = {'x-admin-token': token}

products = [
  {'name': '提拉米苏', 'desc': '马斯卡彭+可可粉', 'channel': '楼下甜品店', 'price': '32', 'qty': 10},
  {'name': '海盐芝士奶盖', 'desc': '海盐芝士+冷萃', 'channel': '美团', 'price': '26', 'qty': 12},
]
for p in products:
    r = requests.post(f'{BASE}/api/admin/products', headers=H, json=p)
    print(p['name'], r.status_code, r.json())
```

## 6. 出错处理

- `401`（任意 admin 接口）：token 失效或没带头 → 重新登录（第 2 步）再重试。
- `400 {"error":"name_required"}`：`name` 为空 → 补上名称。
- `400 {"error":"no_file"}`（上传）：表单字段名不是 `file`，或没带文件。
- 网络层失败：确认 BASE 端口正确、后端在运行（`GET $BASE/api/health` 应返回 `{"ok":true}`）。

## 7. 录入完成后

- 商品会出现在管理后台「商品库」，并带历期累计评分统计。
- 要让用户能评分，还需管理员在某一期的「下午茶设置」里**勾选这些商品**并把该期**设为当前期**。
- 内部字段（渠道/价格/数量）是否对用户展示，由「系统设置」里的统一开关控制。

> 安全：不要把管理密码写进脚本/仓库；通过环境变量或运行时输入传入。涉及写库的接口（登录、上传、录入）请在确认用户授权后执行。
