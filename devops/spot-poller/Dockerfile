FROM python:3.12-alpine

# Install git and bash for StakTrakrApi repo management
RUN apk add --no-cache git bash

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy poller scripts
COPY poller.py update-seed-data.py run-spot.sh ./
RUN chmod +x run-spot.sh

# Git config for committing
RUN git config --global user.name "StakTrakr Spot Poller" && \
    git config --global user.email "spot@staktrakr.local"

CMD ["./run-spot.sh"]
