FROM oven/bun:1 AS base

WORKDIR /app

# Dependencies first (caches this layer)
COPY package.json ./
RUN bun install

# Chromium + all system deps (--with-deps handles it)
RUN bunx playwright install --with-deps chromium

# Source code
COPY . .

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
