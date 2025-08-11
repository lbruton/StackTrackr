# Project Structure

> **Latest release: v3.03.08d**

The repository is organized as follows:

```text
├── css/              # Styling for the application
├── debug/            # Development artifacts
├── docs/             # Project documentation and planning
│   ├── archive/      # Archived notes and historical docs
│   └── future/       # Notes for upcoming features and enhancements
├── archive/          # Previous build snapshots for rollback
├── js/               # Modular JavaScript source files
├── index.html        # Main application interface
├── LICENSE           # License information
├── README.md         # Root project summary
├── sample.csv        # Sample data for import testing
└── structure.md      # Detailed structure reference
```

## Directory Summaries

- **css/** – Contains the global `styles.css` stylesheet.
- **debug/** – Holds temporary debugging files.
- **docs/** – Changelogs, workflow notes, roadmap, and future planning documentation. Includes the [UI Style Guide](ui_style_guide.md).
- **archive/** – Contains the last stable build for users needing a fallback.
- **js/** – All JavaScript modules powering the application, including `customMapping.js` for regex-based field mapping.
- **index.html** – Entry point and user interface for the tool.
- **structure.md** – More detailed explanation of the repository layout.

