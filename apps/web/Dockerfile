FROM node:20-alpine AS deps
WORKDIR /app
# Install workspace dependencies using root lockfile
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the web workspace
RUN npm run build --workspace=@lxplayer/web

FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# App runtime artifacts
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
# Share root node_modules for workspace resolution
COPY --from=deps /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["npm", "start"]


