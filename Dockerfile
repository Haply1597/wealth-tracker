# ===== Stage 1: build client + server =====
FROM node:20-slim AS builder
# 用 yarn 复刻官方构建链（根目录有 yarn.lock + workspaces）
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app

# 先只拷依赖清单，最大化利用层缓存
COPY package.json yarn.lock lerna.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

# --ignore-scripts 跳过 bcrypt/sqlite3/electron 等原生模块编译；
# builder 阶段只需 tsc + vite，不需要这些二进制，原生模块留给运行时阶段（bun install）处理
RUN yarn install --ignore-scripts --frozen-lockfile=false

# 拷源码并构建：
#   yarn build = yarn build:client (vite → ../server/public) + yarn build:server (tsc → server/dist)
COPY client ./client
COPY server ./server
RUN yarn build

# ===== Stage 2: runtime（与原作者 Dockerfile 完全一致）=====
FROM oven/bun:canary-slim
WORKDIR /app
COPY ./server/package.json /app
RUN bun install --production
COPY --from=builder /app/server/dist /app/dist
COPY --from=builder /app/server/public /app/public
EXPOSE 8888
VOLUME ["/app/data"]
CMD ["bun", "dist/index.js"]
