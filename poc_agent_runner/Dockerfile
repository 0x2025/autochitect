# Stage 1: Build stage
FROM node:20-slim AS builder

# Install build dependencies for native modules (tree-sitter)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies for build
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JS
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-slim

# Install git for the Scout node to run git commands
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production dependencies and built assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/registry.json ./
COPY --from=builder /app/moat/lessons_learned.json ./moat/

# Create a workspace directory for cloning repos
RUN mkdir -p /tmp/autochitect && chown -R node:node /tmp/autochitect

USER node

# Default environment variables
ENV NODE_ENV=production
ENV TARGET_REPO_URL=""
ENV GOOGLE_API_KEY=""

# Start the agent
CMD ["node", "dist/index.js"]
