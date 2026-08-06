# BASE STAGE
FROM node:22-bookworm-slim AS base

WORKDIR /app


# PREPARE STAGE
FROM base AS prepare

RUN npm install -g turbo@2.10.2

COPY . .

RUN turbo prune @sparq/api --docker
    

# BUILD STAGE
FROM base AS builder

COPY --from=prepare /app/out/json/ .

RUN npm cache clean --force && npm ci

COPY --from=prepare /app/out/full/ .

RUN npx turbo run build --filter=@sparq/api


# RUNNER STAGE
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=prepare /app/out/json/ .

RUN npm cache clean --force && npm ci --omit=dev

COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]



