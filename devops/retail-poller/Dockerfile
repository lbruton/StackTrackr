FROM node:20-slim

# Install git, cron, and Playwright system deps
RUN apt-get update && apt-get install -y \
    git \
    cron \
    ca-certificates \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node deps (playwright-core + dotenv)
COPY package.json ./
RUN npm install && npx playwright install chromium

# Copy poller scripts
COPY *.js ./

# Git config for committing
ARG GIT_USER_NAME="StakTrakr Poller"
ARG GIT_USER_EMAIL="poller@staktrakr.local"
RUN git config --global user.name "${GIT_USER_NAME}" && \
    git config --global user.email "${GIT_USER_EMAIL}"

# Cron jobs:
#   11:00 AM ET (16:00 UTC) — full direct-dealer scrape via Firecrawl
#   3:00 PM ET  (20:00 UTC) — FBP-only snapshot (FindBullionPrices comparison table)
RUN (echo "0 16 * * * root /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "0 20 * * * root /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1") > /etc/cron.d/retail-poller && \
    chmod 0644 /etc/cron.d/retail-poller

COPY run-local.sh run-fbp.sh ./
RUN chmod +x run-local.sh run-fbp.sh

CMD ["cron", "-f"]
