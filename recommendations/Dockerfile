# Dockerfile — ironclad-recommendations
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
RUN apk add --no-cache dumb-init
RUN addgroup -S nodejs && adduser -S -G nodejs appuser
WORKDIR /app
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --chown=appuser:nodejs src/ ./src/
COPY --chown=appuser:nodejs package.json ./
USER appuser
ENV NODE_ENV=production PORT=4001
EXPOSE 4001
ENTRYPOINT ["dumb-init","--"]
CMD ["node","src/server.js"]
