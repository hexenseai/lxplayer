FROM node:20-alpine AS deps
WORKDIR /app
# Next.js on Alpine needs glibc compatibility for SWC prebuilt binaries
RUN apk add --no-cache libc6-compat
# Install workspace dependencies using root lockfile
COPY package.json package-lock.json ./
# Include workspace manifests so npm can resolve workspaces
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build shared UI first, then web
RUN npm run build --workspace=@lxplayer/ui \
 && npm run build --workspace=@lxplayer/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# Prepare prod deps for the web workspace only
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci --omit=dev --workspace=@lxplayer/web

WORKDIR /app/apps/web
# App runtime artifacts
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
CMD ["npm", "start"]


