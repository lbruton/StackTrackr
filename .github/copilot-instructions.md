# StackrTrackr Copilot Instructions

> **Note**: This file is a quick reference. For detailed agent-specific workflows, see:
> - `/docs/agents/agents.ai`: Shared canonical source
> - `/docs/agents/gpt.ai`: GPT-specific workflow
> - `/docs/agents/claude.ai`: Claude-specific workflow

## Project Overview
StackrTrackr is a client-side precious metals inventory management web app. It runs entirely in the browser with no server dependencies, using localStorage for data persistence.

## Key Architecture Components

### Core Modules
- `init.js`: Application bootstrapping and DOM initialization
- `state.js`: Global state and cached DOM elements 
- `api.js`: Metal price API integrations with provider abstraction
- `inventory.js`: Core inventory CRUD operations
- `events.js`: Centralized event handling
- `constants.js`: Configuration, feature flags, and API provider definitions

### Data Flow
1. User data stored in localStorage under structured keys
2. Spot prices fetched from configurable API providers with caching
3. Changes trigger UI updates through state management system
4. Chart.js visualizations react to data changes

### Critical Patterns

#### DOM Element Caching
```js
// Use state.js elements object, initialized in init.js
elements.spotPriceDisplay[metalKey] = safeGetElement(`spotPriceDisplay${metalName}`);
```

#### API Provider System
```js
// Add new providers in constants.js
METALS_DEV: {
  name: "Metals.dev",
  baseUrl: "https://api.metals.dev/v1",
  endpoints: { ... },
  parseResponse: (data) => data.result,
}
```

#### Modal Management
- Use standard open/close patterns from detailsModal.js
- Manage scrolling: `document.body.style.overflow = 'hidden'/'';`
- Clean up charts with ResizeObserver

## Development Workflow

### Key Commands
- No build process - pure frontend project
- Test via file:// protocol or local server
- Run tests by opening test files in browser

### Testing Guidelines
- Test file imports via file protocol fix module
- Verify localStorage quota (~5-10MB limit)
- Test all three themes (dark/light/sepia)
- Validate mobile responsive layouts

### Common Pitfalls
- Always sanitize imported text for XSS prevention
- Handle API rate limits through proper caching
- Use debounced search for large inventories
- Maintain backward compatibility with stored data

## File Organization
- `/js`: Core application modules
- `/css`: Theme and component styles
- `/docs`: Implementation guides and roadmap
- `/tests`: Browser-based test files

## Adding New Features
1. Update constants.js for feature flags
2. Create modular JS file in /js
3. Register DOM elements in state.js
4. Wire up events in events.js
5. Initialize in init.js sequence
6. Update documentation

## Project-Specific Conventions
- Semantic version: BRANCH.RELEASE.PATCH.state
- localStorage key prefixing for namespacing
- Modal pattern: flex display with themed styling
- Chart.js for all data visualizations
