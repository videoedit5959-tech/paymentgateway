# Multi-stage production build for PaySync Gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled frontend and backend bundle from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi ./openapi

EXPOSE 3000

USER node

CMD ["node", "dist/server.cjs"]
