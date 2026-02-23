############################################################
# StakTrakr All-in-One Fly.io Container
# ─────────────────────────────────────
# Runs the full retail-poller pipeline in a single container:
#   1. Redis           — Firecrawl queue + rate limiting
#   2. RabbitMQ        — Firecrawl job queue
#   3. PostgreSQL 17   — Firecrawl internal DB (pg_cron)
#   4. Firecrawl API   — Scraping endpoint (port 3002)
#   5. Firecrawl Worker + extract-worker + nuq-workers
#   6. Playwright Svc  — Headless Chrome for Firecrawl (port 3003)
#   7. Cron            — retail-poller 15-min cycle
#   8. serve.js        — Public HTTP API (port 8080)
#
# All processes managed by supervisord.
############################################################

# ── Stage 1: Firecrawl app (API + workers) ──────────────
FROM ghcr.io/firecrawl/firecrawl:latest AS firecrawl

# ── Stage 2: Playwright service ─────────────────────────
FROM ghcr.io/firecrawl/playwright-service:latest AS playwright-svc

# ── Stage 3: Final all-in-one image ─────────────────────
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

# System packages: git, cron, supervisor, redis, rabbitmq, postgres, chromium deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    cron \
    ca-certificates \
    supervisor \
    redis-server \
    rabbitmq-server \
    python3 \
    make \
    g++ \
    curl \
    gnupg \
    lsb-release \
    # Chromium dependencies for Playwright service
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0 \
    && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL 17
RUN curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17 postgresql-17-cron \
    && rm -rf /var/lib/apt/lists/*

# ── Copy Firecrawl app ──────────────────────────────────
COPY --from=firecrawl /app /opt/firecrawl
# Firecrawl's node_modules are built for Node 22; our base is Node 20.
# The compiled JS is compatible — only native addons would need a rebuild,
# and Firecrawl has none (pure JS + the bundled go-html-to-md binary).

# ── Copy Playwright service ─────────────────────────────
COPY --from=playwright-svc /usr/src/app /opt/playwright-service
# Copy Playwright browsers installed in the playwright-svc image
COPY --from=playwright-svc /usr/local/share/playwright /usr/local/share/playwright

# ── PostgreSQL init SQL ─────────────────────────────────
COPY nuq-postgres-init.sql /opt/postgres/nuq.sql

# ── Retail poller app ───────────────────────────────────
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY *.js ./
COPY run-local.sh run-fbp.sh run-goldback.sh ./
RUN chmod +x run-local.sh run-fbp.sh run-goldback.sh

# Git config for committing
RUN git config --global user.name "StakTrakr Poller" \
    && git config --global user.email "poller@staktrakr.local"

# ── RabbitMQ setup (needs writable Erlang cookie + owned dirs) ──
RUN mkdir -p /var/lib/rabbitmq /var/log/rabbitmq \
    && echo "staktrakr-cookie" > /var/lib/rabbitmq/.erlang.cookie \
    && chmod 600 /var/lib/rabbitmq/.erlang.cookie \
    && chown -R rabbitmq:rabbitmq /var/lib/rabbitmq /var/log/rabbitmq

# ── Cron jobs ───────────────────────────────────────────
RUN (echo "*/30 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "1 17 * * * root . /etc/environment; /app/run-goldback.sh >> /var/log/goldback-poller.log 2>&1") \
    > /etc/cron.d/retail-poller \
    && chmod 0644 /etc/cron.d/retail-poller

# ── Supervisord config ──────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/staktrakr.conf

# ── Entrypoint ──────────────────────────────────────────
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
