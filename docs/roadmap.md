# Roadmap (Updated: 2025-08-15 13:15:11)

- [ ] The Last Sync time/date is incorrectly recording the last time the user pressed the sync button; this should be the last API pull

- [ ] Unknown items and "Imported by *" items should always sort after items with valid values

- [ ] Correct issue with readme date inconsistencies

- [ ] **Filter Chips Initial Styling Bug** - Chips display wrong styling on page load, correct after filter interaction (BUG-006)

- [ ] **Filter Chip Color Consistency Bug** - Filter chips lose color consistency when filters change, colors shift after add/remove operations despite hash-based color generation fix (BUG-007)

- [ ] **Filter Chips Dropdown Inverse Filtering Bug** - Filter chips dropdown is filtering inversely, expected behavior unclear, may affect core filtering functionality (BUG-008)

- [ ] **CSV Import Price Data Loss Bug** - CSV imports no longer pulling estimated price and purchase prices from Numista import data, causing data loss during import process (BUG-009) ✅ **FIXED**

- [ ] **Edit Button Hover Background Bug** - Edit action buttons still show background highlight on hover despite animation removal request, should have clean hover state (BUG-010) ✅ **FIXED**

## 🏆 Strategic Breakthrough: Gemini-Powered Universal Asset Intelligence Platform

**THE REVOLUTIONARY VISION**: StackTrackr evolves beyond precious metals tracking into a **Universal AI-Driven Asset Intelligence Platform** where Gemini orchestrates the synthesis of community data, public markets, and real-time intelligence into a centralized database that **outclasses every static competitor**.

### 🧠 The Intelligence Synthesis Engine
**Gemini's Role**: AI orchestrator that ingests, processes, and synthesizes:
- **Community Data**: Numista catalogs, collector contributions, historical records
- **Public Market Data**: Live spot prices, dealer premiums, auction results, market trends  
- **Real-Time Intelligence**: News sentiment, economic indicators, supply chain data
- **Dynamic Synthesis**: Creates compound intelligence no single-source platform can match

### ⚡ Cost-Optimized Architecture  
**Smart Resource Management**:
- **Idle Processing**: Gemini works during low-traffic periods to build intelligence cache
- **Token Optimization**: MCP memory + intelligent caching minimizes API costs
- **User API Fallback**: Individual user API keys for premium features and load distribution
- **Progressive Enhancement**: Free tier → Cached intelligence → Live API → Premium features

### 🌐 Platform-Agnostic Expansion Strategy
**Beyond Numismatics**: The StackTrackr intelligence architecture extends to any asset class:

**Current**: Precious metals inventory tracking
**Phase 2**: Network inventory management (IT assets, vulnerabilities)  
**Phase 3**: Any inventory system (art, collectibles, equipment, real estate)
**Phase 4**: Universal asset intelligence API serving multiple verticals

### 🎯 Competitive Positioning vs Numista
- **Numista**: "Here's what the community thinks this coin was worth months ago"
- **StackTrackr**: "Here's what this coin is worth RIGHT NOW based on live market data"

**Our Breakthrough**: While Numista relies on volunteer data entry and historical estimates, StackTrackr leverages **Gemini's Google Search grounding** to provide machine-scale market awareness with **hourly price updates** across all major markets.

### 💰 Market Intelligence at Startup Costs
- **Traditional Market Data**: $500-2000/month (Bloomberg, Reuters)
- **Gemini-Powered Intelligence**: $0-50/month (95%+ cost reduction)
- **Enterprise-Grade Data**: Live spot prices, dealer premiums, auction results
- **Scalable Architecture**: Free tier → Production → Enterprise

### 🚀 Strategic Implementation
**FEATURE-011 - Market Intelligence** positions Gemini as our core price API driver, creating an insurmountable competitive moat through:
- Real-time price discovery vs static historical data
- AI-powered market analysis vs manual community contributions  
- Live portfolio valuations vs outdated estimates
- Predictive market intelligence vs reactive reference data

**Documentation**: See `/docs/gemini-price-api-strategy.md` for complete competitive analysis and technical architecture.

---

## 📋 **Current Development Roadmap**

- [ ] **Numista API Collection Sync Integration** - Implement OAuth-based Numista collection import allowing users to automatically sync their Numista collections with StackTrackr. Includes one-click import, automatic data mapping, conflict resolution, and selective collection import options. Estimated: 4-6 hours implementation. (FEATURE-001 - HIGH PRIORITY)

- [ ] **Encrypted Backup Downloads** - Implement client-side encrypted backup generation allowing users to download their complete inventory data as encrypted files for storage in personal cloud drives. Uses Web Crypto API with password-derived keys, AES-256-GCM encryption, and secure key storage via IndexedDB. Includes backup verification, restore functionality, and optional automatic periodic backup generation. Estimated: 6-8 hours implementation. (FEATURE-002 - HIGH PRIORITY)

- [ ] **Turso Database Personal Sync** - Enable users to connect their personal Turso database instances for encrypted data synchronization. Users provide their Turso database URL and auth token to sync inventory data to their own private Turso cloud database with client-side encryption. Includes conflict resolution, selective sync options, embedded replica support for offline-first architecture, and real-time bidirectional synchronization. Estimated: 8-10 hours implementation. (FEATURE-003 - HIGH PRIORITY)

- [ ] **Multi-Source Numismatic Data Synchronization Module** - Comprehensive data integration system for collecting, merging, and synchronizing numismatic data from multiple sources including Numista API, Heritage Auctions, CoinArchives, PCGS CoinFacts API, NGC Price Guide, CAC/CACG authentication services, and major auction houses (Stack's Bowers, GreatCollections). Features unified data schema normalization, intelligent conflict resolution with source priority weighting, real-time pricing updates, grading service integration, auction alert monitoring, automated valuation updates, and cross-platform collection sync. Includes data source management dashboard, sync scheduling, backup integration with Turso, and comprehensive API rate limiting. Estimated: 20-25 hours implementation for core module, additional 5-8 hours per new API integration. (FEATURE-004 - STRATEGIC PRIORITY)

- [ ] **Community Token & Privacy-First Monetization System** - Implement rSynk-powered community token system enabling privacy-respecting premium features through time-limited tokens. Features anonymous token validation via rSynk API callbacks, storefront for 1-month/1-year "support" subscriptions generating randomized expiring tokens, premium cloud sync services, and opt-in community data sharing program. Premium users contribute anonymized aggregate data (Item, Purchase Price, Market Value, Date, Purchase Location) which creates enriched market datasets redistributed to all users as enhanced pricing intelligence. System maintains zero personally identifiable information, uses cryptographic token validation, implements transparent data contribution policies, and provides community-driven market insights while sustaining development through voluntary premium subscriptions. Includes token management dashboard, subscription storefront integration, automated data aggregation pipeline, and community analytics features. Estimated: 15-20 hours for core token system, 10-12 hours for storefront integration, 8-10 hours for data aggregation pipeline. (FEATURE-005 - BUSINESS CRITICAL)

- [ ] **Gemini-Powered Intelligent Numismatic Analysis Platform** - Deploy Gemini 2.5 Flash as primary AI intelligence for comprehensive numismatic data processing and market analysis. Leverage Gemini's superior multimodal capabilities for: (1) **Advanced Image Recognition** - Process coin/currency images with automatic grading assessment, mint mark identification, and condition analysis using Gemini's vision models, (2) **Intelligent Web Scraping** - Utilize Gemini's native web scraping with BeautifulSoup integration and Google Search grounding for real-time auction data, dealer prices, and market trends from Heritage Auctions, CoinArchives, and dealer networks, (3) **Structured Data Extraction** - Extract pricing data from PDFs, auction catalogs, and dealer sheets using Gemini's Pydantic model integration for perfect numismatic data normalization, (4) **Market Intelligence** - Generate sophisticated market analysis, trend predictions, and investment recommendations using Gemini's reasoning capabilities combined with real-time data access, (5) **Audio Processing** - Support voice-activated inventory management and audio note transcription for collection documentation. Architecture includes progressive scaling (Free Tier → Flash-Lite → Pro), intelligent caching for cost optimization, and batch processing for bulk operations. Gemini's enterprise-grade reliability, 1M+ token context window, and function calling capabilities provide foundation for advanced features like automated bidding alerts, portfolio optimization, and cross-platform data synchronization. Estimated: 12-15 hours for core integration, 8-10 hours for multimodal features, 6-8 hours for market intelligence modules. (FEATURE-006 - GEMINI INTELLIGENCE PLATFORM)

- [ ] **Hybrid Gemini Intelligence System with Multi-Provider Integration** - Implement intelligent routing between Gemini models (primary) and supplementary providers (GPT-4, Claude-3.5) for optimal cost-performance balance. Features automatic task complexity assessment using Gemini's function calling to determine routing: Gemini Flash-Lite for routine analysis, Gemini Pro for complex reasoning, GPT-4 for specialized tasks requiring specific capabilities. System includes intelligent caching (Gemini's context caching + custom layer), request batching for efficiency, comprehensive cost monitoring with configurable budgets, and adaptive prompt engineering optimized for each provider. Gemini serves as primary intelligence with 95%+ of requests, while expensive alternatives handle edge cases only. Provides premium AI-powered insights for community token holders including personalized collection strategies, market timing recommendations, and automated investment analysis. Leverages Gemini's Google Search grounding for real-time market data, batch processing for cost optimization, and enterprise-grade reliability. Estimated: 8-10 hours for Gemini-centric routing logic, 4-5 hours for multi-provider integration, 3-4 hours for cost optimization. (FEATURE-007 - PREMIUM ENHANCEMENT)

- [ ] **Real-Time Precious Metals Spot Price Integration with Gemini Search Grounding** - Implement automatic hourly spot price monitoring using Gemini's official Google Search grounding capability for legal, real-time market data. Features: (1) **Google Search Grounding Integration** - Utilize Gemini API's built-in `tools=[{'google_search': {}}]` feature to legally access current gold, silver, platinum, and palladium spot prices from official sources like COMEX, APMEX, and major dealers without bypassing restrictions, (2) **Automated Hourly Updates** - Schedule background tasks to query latest spot prices every hour with intelligent caching to stay within API quotas while maintaining real-time accuracy, (3) **Price History Tracking** - Store historical price data locally to generate trend charts, percentage changes, and market volatility analysis for informed collecting decisions, (4) **Portfolio Value Calculations** - Automatically update total portfolio value based on current spot prices with detailed breakdown by metal type and individual item appreciation/depreciation, (5) **Price Alert System** - Configurable notifications when spot prices hit user-defined thresholds for buying opportunities or significant market movements. System includes proper source attribution per Google's API requirements, rate limiting compliance, and transparent pricing methodology. This approach is completely legal as it uses Google's official API features rather than bypassing restrictions. Perfect integration with our Gemini-centric architecture providing enterprise-grade market intelligence at minimal cost. Estimated: 8-10 hours API integration, 6-8 hours scheduling system, 10-12 hours portfolio calculations, 6-8 hours alert system. (FEATURE-011 - MARKET INTELLIGENCE)

- [ ] **Conversational Digital Assistant with Gemini Chat Bubble** - Transform StackTrackr into conversational platform where users interact with Gemini through intuitive chat interface for all inventory operations. Features: (1) **Floating Chat Bubble** - Modern chat widget in bottom-right corner with conversation history, typing indicators, and smooth animations providing seamless digital assistant experience, (2) **Bulk Operations via Natural Language** - Users can request complex changes through conversation: "Add 10 silver eagles, remove my gold bars, update prices for all platinum items", "Show me all coins worth over $500", "Create a report for tax season", enabling multi-item edits, batch price updates, mass deletions, filtered operations through simple chat commands, (3) **Intelligent Conversation Flow** - Gemini understands context across messages, maintains conversation state, handles follow-up questions, and provides clarification when needed: "Update those coins I mentioned" → remembers previous context, (4) **Live Data Integration** - Chat assistant has direct access to inventory database, performing real-time operations while providing instant feedback and confirmations with preview-before-apply functionality, (5) **MCP Memory Enhancement** - Specialized memory system pre-loads numismatic knowledge (coin terminology, grading standards, market data) reducing token costs by 40-60% while enabling expert-level responses. Architecture includes WebSocket real-time communication, conversation state management, secure database integration, and progressive enhancement from basic chat to full digital assistant. Perfect integration with Gemini's free tier for development, scaling to paid tiers for production. Estimated: 12-15 hours chat interface, 8-10 hours bulk operations, 10-12 hours MCP integration, 6-8 hours database connectivity. (FEATURE-010 - CONVERSATIONAL ASSISTANT)

- [ ] **Specialized MCP Memory Enhancement for Numismatic Intelligence** - Develop domain-specific MCP memory system that enriches Gemini with specialized numismatic knowledge, dramatically improving AI performance while reducing token costs. Features: (1) **Numismatic Knowledge Base** - Pre-loaded MCP memory with comprehensive coin terminology, grading standards (PCGS/NGC), mint mark references, error coin classifications, and market condition assessments that eliminate need for extensive prompting, (2) **Context-Aware Intelligence** - MCP serves as knowledge bridge between generic Gemini capabilities and specialized domain expertise, enabling sophisticated coin identification, attribution, and valuation without domain-specific fine-tuning, (3) **Persistent Learning Architecture** - Custom memory schemas store structured numismatic entities (coins, series, varieties, errors) with relationships and historical patterns that accumulate knowledge across all AI interactions, (4) **Cross-Application Knowledge Sharing** - Specialized memory integrates with rEngine platform to share numismatic intelligence across StackTrackr, VulnTrackr (for precious metals security), and future applications, (5) **Token Optimization** - Domain pre-loading reduces Gemini API costs by 40-60% through eliminating repetitive context establishment in prompts. System includes dynamic memory updating from community contributions, automated knowledge validation, and intelligent context injection based on current task requirements. This architecture transforms Gemini from general AI into numismatic specialist while maintaining cost efficiency and scalability. Estimated: 15-18 hours for MCP memory architecture, 10-12 hours for numismatic knowledge base, 8-10 hours for cross-platform integration. (FEATURE-009 - SPECIALIZED INTELLIGENCE)

## ✅ **Recently Fixed**

- [x] **Fraction Display Bug** - CSV imports converting "1/2" to "12" in name fields, resolved by re-importing data with corrected CSV processing (BUG-011 - FIXED via re-import)

- [x] **Default Filter Pagination** - Changed default items per page from 25 to 10 for better initial user experience (IMPROVEMENT-001 - COMPLETED)

- [x] **Numerical Value Consistency** - Standardized font sizes and added subtle color coding for all numerical columns (qty, weight, prices, premiums) (IMPROVEMENT-002 - COMPLETED)

## 🎨 **Design Language & UI Modernization**

- [ ] **Establish Multi-Tool Design Language** - Create unified design system across StackTrackr, VulnTrackr, and Network Inventory Tool based on excellent table design from Network Inventory Tool (DESIGN-001)

- [ ] **Redesign Totals Cards** - Redesign totals cards popups to match VulnTrackr style with stats grid layout and better visual hierarchy (DESIGN-002)

- [ ] **Clean Up Spot Price Section** - Remove dropdown buttons under spot prices, simplify interface to match VulnTrackr clean design approach (DESIGN-003)

- [ ] **Task Organization and Delegation System** - Review all tasks/todo lists across projects, organize by priority and complexity, assign delegates/ownership to each task (MGMT-001)

- [ ] **Weekly Memory Gap Analysis** - Systematic weekly review of memory coverage, identify and fill weak points in context preservation, ensure agent handoff continuity (MGMT-002)

- [ ] **Monthly Roadmap Review and Update** - Comprehensive monthly review of roadmap items, update priorities, archive completed tasks, add new requirements (MGMT-003)

- [ ] Fuzzy search filter shows American Gold Eagle when typing "Eagle" or "Silver Eagle" - needs refinement

- [ ] Error recovery procedures missing for critical failures

- [ ] Data corruption detection and recovery mechanisms

- [ ] Agent coordination timeout mechanisms

- [ ] Memory leak detection for long-running sessions

- [ ] Cross-browser compatibility edge cases

- [ ] localStorage quota limit handling

- [ ] When importing data, if no value is present, check other Numista price values. If none, set the price to 0.00

- [ ] When opening Numista links, open them in a new, appropriately sized window with close, back, and forward controls

- [ ] "Change Log" should have a square recycle bin icon instead of text

- [ ] In the table, when filtered, dynamically remove empty columns

- [ ] When the width narrows to mobile sizes, double the height of the table rows

- [ ] Re-theme the light mode with the new "Darker Light" palette

- [ ] Add exponential backoff and a user-visible retry banner for API rate limits

- [ ] Move the "Minimum Chip Items" dropdown under the "Items" dropdown

- [ ] Add a checkbox under the "Minimum Chip Items" dropdown to include date and price values for all cells

- [ ] Add a toggle to enable/disable weight in the filters tool

- [ ] Provide a toggle to switch between a condensed, scrolling view and an auto-expanding view

- [ ] Group all control toggles into a card under the "Items" dropdown

- [ ] The "Title/Name" column should allow fractions

- [ ] Center the titles and subtitles on the cards in the files modal

- [ ] Add "You may be entitled to compensation" to the boating accident joke, scaled to fit under the button

- [ ] Add "Purchase" and "Issue" year filters

- [ ] Performance monitoring and baseline measurements

- [ ] Integration testing framework for multi-agent workflows

- [ ] Automated testing for localStorage quota limits

- [ ] Security audit automation and scheduling

- [ ] User-Customizable Theme System

- [ ] Create a Debug API Button that opens a modal showing the API response in text/JSON and a table

- [ ] Comprehensive error recovery strategy with rollback procedures

- [ ] Data migration system with schema versioning

- [ ] Agent coordination recovery mechanisms

- [ ] Automated performance regression testing

- [ ] Real-time collaboration features for agents

- [ ] Predictive failure detection system

- [ ] Advanced dependency resolution for agent tasks

- [ ] User experience metrics collection

- [ ] Automated CI/CD pipeline integration

- [ ] Data schema versioning system implementation

- [ ] localStorage corruption detection utilities

- [ ] Automated migration scripts for breaking changes

- [ ] Performance baseline and monitoring infrastructure

- [ ] Security threat model documentation

- [ ] Dependency vulnerability tracking system

- [ ] Agent task coordination database

- [ ] Distributed task management system

- [ ] Emergency procedures documentation (`/docs/emergency-procedures.md`)

- [ ] Advanced agent handoff validation system

- [ ] Integration test suite for core workflows

- [ ] Cross-theme compatibility verification automation

- [ ] Regression testing pipeline for major changes

- [ ] Agent coordination failure simulation

- [ ] XSS/injection attack simulation testing

- [ ] Browser compatibility automation

- [ ] Performance benchmark automation

- [ ] Data integrity validation during upgrades

- [ ] Performance Optimization Quick Wins (100 min total)

- [ ] Fix bug in user authentication module
- [ ] Add unit tests for payment gateway
- [ ] Update API documentation for v2.0
