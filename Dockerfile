# syntax=docker/dockerfile:1
# Production image: Vite client build + Express API (tsx runs TypeScript; project has noEmit).
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g npm@11
COPY package.json package-lock.json ./
# --ignore-scripts: the postinstall `prisma generate` needs prisma/schema.prisma,
# which is not copied yet. Generate explicitly after the full source is in place.
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
ARG VITE_GEMINI_API_KEY=
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
# postgresql-client-16 (matches prisma/pgvector container's pg16) provides pg_dump/pg_restore/psql
# for the scheduled-jobs backup feature (server/lib/backupCommand.ts) when DB_DRIVER=sql.
RUN npm install -g npm@11 && \
    apt-get update && apt-get install -y ca-certificates wget gnupg docker.io && \
    install -d /usr/share/postgresql-common/pgdg && \
    wget --quiet -O /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list' && \
    apt-get update && apt-get install -y postgresql-client-16 && \
    rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm install tsx@^4.21.0
COPY server.ts ./
COPY server ./server
COPY lib ./lib
# Shared helpers imported by server routes (e.g. materiality CSV parser).
COPY src/lib/materialityScoringCsv.ts ./src/lib/materialityScoringCsv.ts
COPY scripts ./scripts
COPY prisma ./prisma
# Generate the Prisma client into the runtime image so DB_DRIVER=sql works.
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3010
CMD ["./node_modules/.bin/tsx", "server.ts"]
