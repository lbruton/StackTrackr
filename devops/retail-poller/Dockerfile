FROM node:20-slim

# Install git, cron, and TLS certs
RUN apt-get update && apt-get install -y \
    git \
    cron \
    ca-certificates \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node deps (dotenv only — native fetch used for Firecrawl API calls)
COPY package.json ./
RUN npm install --omit=dev

# Copy poller scripts and shell scripts
COPY *.js ./
COPY run-local.sh run-fbp.sh docker-entrypoint.sh ./
RUN chmod +x run-local.sh run-fbp.sh docker-entrypoint.sh

# Git config for committing
ARG GIT_USER_NAME="StakTrakr Poller"
ARG GIT_USER_EMAIL="poller@staktrakr.local"
RUN git config --global user.name "${GIT_USER_NAME}" && \
    git config --global user.email "${GIT_USER_EMAIL}"

# Cron jobs:
#   Hourly (5 past each hour) — full Firecrawl scrape, commit, push to data branch
#   3:00 PM ET (20:00 UTC) daily — FBP gap-fill for any failed providers from hourly runs
RUN (echo "5 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1") > /etc/cron.d/retail-poller && \
    chmod 0644 /etc/cron.d/retail-poller

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["cron", "-f"]
