# Base image
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS runner

WORKDIR /app

# Set node env to production
ENV NODE_ENV production

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "apps/api/dist/index.js"]
