# Base image
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root configurations
COPY package.json package-lock.json turbo.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies (using npm ci for clean install if lockfile exists)
RUN npm ci

# Build the API (assumes there is a build script in apps/api/package.json)
WORKDIR /app/apps/api
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

# The PDF pipeline invokes the bundled Python extractors at runtime.
RUN apk add --no-cache python3 py3-pip \
  && python3 -m pip install --no-cache-dir --break-system-packages requests PyMuPDF Pillow

# Set node env to production
ENV NODE_ENV production
# Align the listening port with EXPOSE below so the process binds to the port
# the platform expects, regardless of whether PORT is injected externally.
ENV PORT 8080

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
# tsup only emits TypeScript output; Python extractor scripts must be copied
# explicitly so production containers can execute the extraction pipeline.
COPY --from=builder /app/apps/api/src/services/extractor ./apps/api/dist/services/extractor

# Expose port
EXPOSE 8080

# Container healthcheck — hits the readiness endpoint. A 503 (dependency down)
# is treated as unhealthy so the orchestrator stops routing traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- --spider http://127.0.0.1:${PORT}/health || exit 1

# Start the application
CMD ["node", "apps/api/dist/index.js"]
