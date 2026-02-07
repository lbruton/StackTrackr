# StackTrackr

A client-side precious metals inventory tracker for Silver, Gold, Platinum, and Palladium. Runs entirely in the browser with no backend dependencies.

## Features

- **Portfolio tracking** with purchase price, melt value, retail price, and computed gain/loss
- **Live spot prices** from multiple API providers with automatic fallback
- **Inline editing** for quick updates without opening full modals
- **CSV import/export** with intelligent field mapping and ZIP backup support
- **PDF reports** with customizable formatting
- **Numista catalog integration** for coin identification and metadata
- **Advanced filtering** with summary chips, fuzzy search, and multi-column sorting
- **Four themes** — light, dark, sepia, and system-detected
- **Spot price history** with Chart.js trend visualization
- **Works offline** — all data stored in browser localStorage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Pure client-side JavaScript (no framework) |
| Storage | Browser localStorage |
| Styling | Vanilla CSS with responsive breakpoints |
| Charts | Chart.js 3.9.1 |
| CSV | PapaParse 5.4.1 |
| PDF | jsPDF 2.5.1 + AutoTable 3.5.25 |
| Backup | JSZip 3.10.1 |
| Deployment | Docker (nginx:alpine) |

## Quick Start

**Option 1 — Local file**
```
open index.html
```

**Option 2 — HTTP server**
```
python -m http.server 8000
```

**Option 3 — Docker**
```bash
docker-compose up -d --build
# Access at http://localhost:8080
```

## Project Structure

```
index.html          Main application (single page)
css/styles.css      Complete styling
js/                 31 JavaScript modules
  constants.js        Global config, API providers, storage keys
  state.js            Application state management
  inventory.js        Core CRUD operations
  events.js           Event handlers and UI interactions
  spot.js             Spot price history and display
  api.js              External pricing API integration
  utils.js            Formatting, validation, helpers
  sorting.js          Multi-column table sorting
  filters.js          Advanced column filtering
  charts.js           Chart.js spot price visualization
  init.js             Application initialization (loads last)
  ...and 20 more feature modules
docs/               Architecture documentation
```

## License

Personal project. Not currently accepting contributions.
