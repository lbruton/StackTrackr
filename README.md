# StackTrackr

A comprehensive client-side web application for tracking precious metal investments including silver, gold, platinum, and palladium.

## Quick Start

1. Open `index.html` in a web browser
2. No server required - runs entirely client-side
3. Data stored locally using browser localStorage

## Features

- Real-time spot price tracking
- Premium calculations
- Investment portfolio management
- Multi-format data import/export
- Offline functionality

## Development

For full documentation, agent protocols, and development resources, see the [rAgents repository](https://github.com/lbruton/rAgents).

### Agent Integration

This project uses centralized agent management through rAgents:

```bash
# Sync project memory to central hub
./scripts/sync_to_ragents.sh

# Pull latest protocols and documentation
./scripts/sync_from_ragents.sh
```

## License

See LICENSE file for details.
