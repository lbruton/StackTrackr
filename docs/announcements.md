## What's New

- **Autocomplete Migration & Version Check CORS (v3.26.02)**: One-time migration auto-enables fuzzy autocomplete for users with silently disabled flag. Fixed version check CORS failure from staktrakr.com 301 redirect
- **Fuzzy Autocomplete Settings Toggle (v3.26.01)**: Added On/Off toggle for fuzzy autocomplete in Settings > Filter Chips. Fixed autocomplete feature flag not discoverable when persisted as disabled
- **STACK-62: Autocomplete & Fuzzy Search Pipeline (v3.26.00)**: Autocomplete dropdowns on form inputs (name, purchase/storage location), abbreviation expansion in search (ASE, kook, krug, etc.), fuzzy fallback with indicator banner, registerName() for dynamic suggestions, Firefox compatibility fix
- **STACK-71: Details modal QoL (v3.25.05)**: Pie chart percentage labels on slices, sticky metric toggle, scrollable modal body fixes overflow cascade, circular chart aspect-ratio, ResizeObserver leak fix, sepia theme chart colors

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles
- **PWA Support (STACK-74)**: Manifest, service worker, installable app experience
