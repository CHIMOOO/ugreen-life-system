# Docker 部署教程

整套系统打包成**一个镜像**：Node 服务同时提供接口、上传，并伺服前台与后台静态页面（同源，无跨域）。

部署成功后访问：

| 入口 | 地址 |
| --- | --- |
| 用户前台 | `http://<服务器IP>:41131/` |
| 管理后台 | `http://<服务器IP>:41131/admin` |
| 健康检查 | `http://<服务器IP>:41131/api/health` |

管理后台默认密码由 `ADMIN_PASSWORD` 决定（compose 里已设为 `admin123`）。

---

## 一、快速部署（推荐 · docker compose）

需要已安装 Docker。在项目根目录执行：

```bash
# 构建并后台启动
docker compose up -d --build

# 查看日志
docker compose logs -f
```

就这一条命令。数据库文件与上传图片通过数据卷持久化在宿主机：
- `./server/data`（SQLite 数据库 `data.sqlite`）
- `./server/uploads`（奖品 / 下午茶 / 商品图片）

> 老环境只有 `docker-compose`（带横杠）也兼容：把上面命令换成 `docker-compose up -d --build` 即可（compose 文件已带 `version: "3.8"`）。

### 不用 compose，直接用 docker

```bash
docker build -t choujiang-life .
docker run -d --name choujiang -p 41131:41131 \
  -e ADMIN_PASSWORD='admin123' \
  -v "$(pwd)/server/data:/app/server/data" \
  -v "$(pwd)/server/uploads:/app/server/uploads" \
  choujiang-life
```

---

## 二、更新教程（拉新代码后重新部署）

数据卷不会被覆盖，更新镜像不丢数据：

```bash
git pull                       # 拉取最新代码
docker compose up -d --build   # 重新构建并滚动重启
```

或分步：

```bash
docker compose build           # 只构建新镜像
docker compose up -d           # 用新镜像重启容器
docker image prune -f          # 可选：清理旧镜像
```

老写法：

```bash
docker-compose build && docker-compose up -d
```

回滚：保留旧镜像 tag，或 `git checkout <旧提交>` 后再 `up -d --build`。

---

## 三、常用运维

```bash
# 停止 / 启动 / 重启
docker compose down
docker compose up -d
docker compose restart

# 进入容器
docker compose exec app sh

# 写入一份演示数据（会清空现有数据，仅用于试用！）
docker compose exec app npm --prefix server run seed

# 改管理密码：编辑 docker-compose.yml 的 ADMIN_PASSWORD 后
docker compose up -d
```

### 改端口

把 compose 里的 `ports: - "41131:41131"` 左边改成你想要的宿主机端口，例如 `"8080:41131"`，然后 `docker compose up -d`。容器内部端口保持 41131 即可。

### 用 .env 管理密码（可选）

在项目根目录建 `.env`：

```
ADMIN_PASSWORD=换成你的密码
```

compose 会自动读取同名变量；或在容器内 `server/.env` 亦可（服务启动带 `--env-file-if-exists=.env`）。

---

## 四、说明

- 镜像基于 `node:24-alpine`，数据库用 Node 内置 `node:sqlite`，**无原生依赖**，构建快、体积小。
- 前台、后台、接口同源，前端调用接口用相对路径，无需配置跨域或额外网关。
- 首次部署数据库为空：前台显示「暂无活动」，进 `/admin` 登录后创建期数、设为当前期即可。
