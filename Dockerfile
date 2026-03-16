# ── Stage 1: Install dependencies ────────────────────────────────────────────
# Use a full Node image only in the build stage where we need npm
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only package files first to maximise Docker layer cache.
# This layer only rebuilds when dependencies change, not when source code changes.
COPY package*.json ./

# --omit=dev excludes devDependencies from the production image
RUN npm ci --omit=dev

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Never run application code as root inside a container.
# Create a dedicated non-root user and group.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what is needed to run — not tests, not dev config
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup migrations/ ./migrations/
COPY --chown=appuser:appgroup package.json ./

USER appuser

EXPOSE 3000

# Use node directly (not npm start) so that OS signals (SIGTERM, SIGINT)
# are delivered straight to the Node process, enabling graceful shutdown.
# If you use `npm start`, npm intercepts signals and the graceful shutdown
# handler in app.js will never fire.
CMD ["node", "src/app.js"]
