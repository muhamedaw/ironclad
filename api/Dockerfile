# ── Build stage ──────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only manifests first for Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force


# ── Runtime stage ─────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs appuser

WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:nodejs src/ ./src/
COPY --chown=appuser:nodejs package.json ./

# Create logs directory with correct ownership
RUN mkdir -p logs && chown appuser:nodejs logs

USER appuser

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# dumb-init as PID 1 ensures proper SIGTERM propagation and zombie reaping
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
