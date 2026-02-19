# DevOps Setup Guide

This guide explains how to set up the developer tooling and automation for the StakTrakr project.

## 1. Git Hooks

The pre-commit hook ensures that the Service Worker cache is always stamped with a fresh build identifier when core assets change.

### Installation
Run the following command from the repository root:
```bash
ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit
```

### Verification
1.  Stage a change to a JS or CSS file.
2.  Commit the change.
3.  Observe the console output: `[stamp-sw-cache] CACHE_NAME updated: staktrakr-v...`
4.  Verify that `sw.js` has a modified `CACHE_NAME`.

## 2. Spot Poller (Docker)

The spot poller maintains the historical price data in the `data/` directory.

### Prerequisites
*   Docker and Docker Compose
*   A [MetalPriceAPI](https://metalpriceapi.com/) API key

### Setup
1.  Navigate to the poller directory:
    ```bash
    cd devops/spot-poller/
    ```
2.  Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
3.  Edit `.env` and add your `METAL_PRICE_API_KEY`.
4.  Start the service:
    ```bash
    docker-compose up -d
    ```

### Logs
Monitor the poller activity:
```bash
docker-compose logs -f
```

## 3. JSDoc Generation

To generate the HTML documentation portal:

### Setup
1.  Navigate to the `devops/` directory:
    ```bash
    cd devops/
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Usage
Generate the documentation:
```bash
npm run jsdoc
```
The output will be available in `docs/api/`.
