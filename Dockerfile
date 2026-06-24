FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ---

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Hosted deployments speak MCP over Streamable HTTP. The stdio entry
# point (dist/index.js) is still used by `npx wc26-mcp` for local clients.
CMD ["node", "dist/http.js"]
