# StackrTrackr Announcements

## What's New
- **v3.04.86 – Centered Name header**: Wrapped "Name" header text with `.header-text` span for consistent alignment and removed obsolete centering rules.
- **v3.04.82 – Logo height via CSS**: Removed invalid height attribute from Stackr logo SVG, relying on CSS for proper sizing.
- **v3.04.81 – Composition helper cleanup**: Removed obsolete composition helper comment and synchronized documentation.
- **v3.04.76 – Table Item Counter**: Added dynamic item counter below the inventory table displaying the number of visible items with muted, right-aligned styling.
- **v3.04.74 – CSV Import/Export Fixes**: Fixed undefined notes reference in imports, improved CSV export cleanup, and restored global access for import/export functions.
- **v3.04.73 – Changelog loading fix**: Resolved "Unable to load changelog" error by adding embedded fallback data for version notifications and about modal content.
- **v3.04.72 – Complete filter logic overhaul**: Fixed dual chip system conflicts, implemented fully clickable filter chips, resolved search precision issues, and eliminated duplicate displays. Filter system now works exactly as intended.
- **v3.04.71 – Search precision fix**: Fixed search logic where "Silver Eagle" was incorrectly matching "Gold Eagle" items. Multi-word searches now require ALL words to match.
- **v3.04.70 – Grouped filter chips**: Added grouped name chips feature with toggle - consolidates similar items like "American Silver Eagle (3)" instead of separate year variants.

## Development Roadmap
- **Phase 3**: Advanced filtering system with date ranges and multi-criteria support
- **Enhanced mobile experience**: Touch-optimized interfaces and better small screen layouts  
- **Data visualization**: Interactive charts for portfolio analysis and performance tracking
- **Export improvements**: PDF reports and enhanced CSV formatting options
- **Framework migration**: Evaluate moving from file:// protocol to modern web framework
