# CodeGraphContext MCP Server — Neo4j backend
# Multi-stage build: Python 3.12-slim with CGC installed

FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y \
    gcc g++ make git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir codegraphcontext

# ---- Production stage ----
FROM python:3.12-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy installed packages and cgc binary from builder
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /usr/local/bin/cgc /usr/local/bin/cgc

# Create workspace and data directories
RUN mkdir -p /workspace /root/.codegraphcontext

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CGC_HOME=/root/.codegraphcontext

WORKDIR /workspace

CMD ["sleep", "infinity"]
