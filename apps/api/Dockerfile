# Base image
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Bust Docker layer cache on every commit — Railway injects RAILWAY_GIT_COMMIT_SHA
# automatically as a build arg, so the cache is always fresh.
ARG CACHEBUST=1

# Copy root configurations
COPY package.json package-lock.json turbo.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies. Using `npm install` (not `npm ci`) so the build
# succeeds even if package-lock.json is momentarily out of sync with
# package.json (npm install reconciles the lockfile; npm ci refuses).
# For fully reproducible builds, regenerate and commit package-lock.json from
# a local `npm install` and this can switch back to `npm ci`.
RUN npm install --no-audit --no-fund

# The runner stage below copies apps/api/node_modules as its own layer,
# separate from the root node_modules copy. npm workspaces only actually
# materializes that nested directory when at least one dependency can't be
# deduped to the root — true before the @types/express override collapsed
# every apps/api dependency into a single shared copy, false after. The
# COPY --from=builder in the runner stage fails outright ("not found") if
# the source path doesn't exist at all, so this guarantees it always does,
# regardless of what npm's hoisting decides for any given dependency tree.
RUN mkdir -p apps/api/node_modules

# Build the API (assumes there is a build script in apps/api/package.json)
WORKDIR /app/apps/api
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

# The PDF pipeline invokes the bundled Python extractors at runtime.
# openai + python-dotenv are required by gemini_page_extractor.py
# (the Gemini extraction stage); PyMuPDF + Pillow by pymupdf_extractor.py.
RUN apk add --no-cache python3 py3-pip \
  && python3 -m pip install --no-cache-dir --break-system-packages \
     requests PyMuPDF Pillow openai python-dotenv

# Set node env to production
ENV NODE_ENV=production
# Align the listening port with EXPOSE below so the process binds to the port
# the platform expects, regardless of whether PORT is injected externally.
ENV PORT=8080

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
# tsup bundles to a flat dist/ (index.js + worker.js), so __dirname at runtime
# resolves to /app/apps/api/dist. Copy Python extractor scripts there directly.
COPY --from=builder /app/apps/api/src/services/extractor ./apps/api/dist

# Expose port
EXPOSE 8080

# Container healthcheck — hits the readiness endpoint. A 503 (dependency down)
# is treated as unhealthy so the orchestrator stops routing traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- --spider http://127.0.0.1:${PORT}/health || exit 1

# Start the application
CMD ["node", "apps/api/dist/index.js"]
