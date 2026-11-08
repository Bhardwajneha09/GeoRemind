
# Stage 1: Install production dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --omit=dev && npm cache clean --force


# Stage 2: Production runtime
FROM node:20-alpine AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Create a non-root application user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed dependencies
COPY --from=dependencies --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy backend source code
COPY --chown=appuser:appgroup backend/ ./

# Copy frontend files to the expected static directory
COPY --chown=appuser:appgroup frontend/ /frontend/

USER appuser

EXPOSE 3000

CMD ["npm", "start"]
