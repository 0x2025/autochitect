# Stage 1: Build CLI
FROM node:20-slim AS cli-builder
WORKDIR /app/cli
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY poc_agent_runner/package.json poc_agent_runner/pnpm-lock.yaml ./
RUN pnpm install
COPY poc_agent_runner/src ./src
COPY poc_agent_runner/registry.json poc_agent_runner/tsconfig.json ./
COPY poc_agent_runner/moat ./moat
RUN pnpm run build:docker

# Stage 2: Build Website
FROM node:20-slim AS web-builder
WORKDIR /app/web
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY website/package.json website/pnpm-lock.yaml ./
RUN pnpm install
COPY website ./
RUN pnpm run build

# Stage 3: Runtime
FROM node:20-slim
WORKDIR /app

# Install git for CLI
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy CLI artifacts
COPY --from=cli-builder /app/cli/dist /app/cli/dist
COPY --from=cli-builder /app/cli/node_modules /app/cli/node_modules
COPY --from=cli-builder /app/cli/package.json /app/cli/package.json
COPY --from=cli-builder /app/cli/registry.json /app/cli/registry.json
COPY --from=cli-builder /app/cli/moat /app/cli/moat

# Copy Website artifacts
COPY --from=web-builder /app/web/public /app/web/public
COPY --from=web-builder /app/web/.next /app/web/.next
COPY --from=web-builder /app/web/node_modules /app/web/node_modules
COPY --from=web-builder /app/web/package.json /app/web/package.json

# Output directory for reports
RUN mkdir -p /app/output && chmod 777 /app/output

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start website
WORKDIR /app/web
CMD ["npm", "start"]
