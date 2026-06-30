# ---------- 构建前端 ----------
FROM node:24-alpine AS build
WORKDIR /app

# 前台 web（部署到根路径 /）
COPY web/package*.json ./web/
RUN cd web && npm ci
COPY web/ ./web/
RUN cd web && npm run build

# 后台 admin（部署到子路径 /admin，接口走同源相对路径）
COPY admin/package*.json ./admin/
RUN cd admin && npm ci
COPY admin/ ./admin/
RUN cd admin && VITE_BASE=/admin/ VITE_WEB_BASE= npm run build

# ---------- 运行时（Node 服务 + 同源伺服前端） ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=41131

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/

# 把前端构建产物注入到同源 public 目录，由 Node 一起伺服
COPY --from=build /app/web/dist ./server/public/web
COPY --from=build /app/admin/dist ./server/public/admin

EXPOSE 41131
CMD ["node", "--no-warnings", "--env-file-if-exists=.env", "server/src/index.js"]
