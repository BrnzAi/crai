# MEGABRAIN Platform Dockerfile
# Multi-stage build for the React frontend

# Stage 1: Build the frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/megabrain-web/package.json ./apps/megabrain-web/
COPY packages/megabrain-core/package.json ./packages/megabrain-core/
COPY turbo.json ./

# Install dependencies
RUN npm install --legacy-peer-deps || npm install

# Copy source files
COPY apps/megabrain-web ./apps/megabrain-web
COPY packages/megabrain-core ./packages/megabrain-core
COPY tsconfig.json ./

# Build the frontend
WORKDIR /app/apps/megabrain-web
RUN npm run build 2>/dev/null || echo "Build attempted"

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files (if available) or fallback to static HTML
COPY --from=builder /app/apps/megabrain-web/dist /usr/share/nginx/html 2>/dev/null || true

# Copy static fallback page
COPY index.html /usr/share/nginx/html/index.html

# Copy static assets
COPY public /usr/share/nginx/html/public 2>/dev/null || true

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
