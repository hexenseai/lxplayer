FROM node:20-alpine AS deps
WORKDIR /app
# Next.js on Alpine needs glibc compatibility for SWC prebuilt binaries
RUN apk add --no-cache libc6-compat
# Install workspace dependencies using root lockfile
COPY package.json package-lock.json ./
# Include workspace manifests so npm can resolve workspaces
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
# Configure npm for better network reliability and install dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set maxsockets 1 && \
    npm ci --prefer-offline --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Environment variables for build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_TINYMCE_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_TINYMCE_API_KEY=$NEXT_PUBLIC_TINYMCE_API_KEY
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
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set maxsockets 1 && \
    npm ci --omit=dev --workspace=@lxplayer/web --prefer-offline --no-audit --no-fund

WORKDIR /app/apps/web
# App runtime artifacts
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
CMD ["npm", "start"]


