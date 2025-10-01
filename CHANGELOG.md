# Changelog

All notable changes to StackrTrackr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **Master Password Encryption Feature** (2025-10-01)
  - Removed UI section from API modal (74 lines)
  - Removed `js/encryption.js` (995 lines)
  - Removed encryption event handlers from `events.js` (258 lines)
  - Simplified `saveData()` and `loadData()` in `utils.js` (removed encryption checks)
  - Removed Phase 15 encryption initialization from `init.js`
  - **Reason:** Feature was fundamentally incompatible with pure client-side architecture
  - **Note:** Future encryption will require backend server with proper session management

### Added

- Comprehensive code quality improvement roadmap
- Semantic versioning adoption following semver.org specification
- Structured changelog management following keepachangelog.com format
- Version management workflow integration
- Release criteria for v1.0.0 stable release
- Complete architectural documentation in `/docs/` folder

### Changed

- Development workflow now includes version tracking and changelog updates
- Timeline restructured to include foundational Phase 0 for standards
- localStorage now stores data unencrypted (appropriate for personal deployment)

## [0.1.0] - 2024-08-31

### Initial Release

- Initial StackrTrackr precious metals inventory tracking application
- Client-side localStorage persistence with file:// protocol support
- Multiple spot price API providers (metals-api.com, fcsapi.com, etc.)
- CSV import/export functionality with ZIP backup support
- Premium calculation system for precious metals (spot price + premium)
- Responsive theme system with four modes (light/dark/sepia/system)
- Real-time search and filtering capabilities across inventory
- PDF export with customizable formatting and styling
- Comprehensive debugging and logging system
- Security-focused development patterns and file protocol compatibility
- RESTful API abstraction layer supporting multiple data providers
- Advanced data manipulation utilities for date parsing and currency conversion
