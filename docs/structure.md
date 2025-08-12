# Project Structure


> **Latest release: v3.04.24**


The repository is organized as follows:

```text
├── archive/          # Previous build snapshots for rollback
├── backup/           # Backup copies of key files
├── css/              # Styling for the application
├── docs/             # Project documentation and planning
│   ├── archive/      # Archived notes and historical docs
│   └── future/       # Notes for upcoming features and enhancements
├── images/           # Project icons and favicons
├── js/               # Modular JavaScript source files
├── scripts/          # Utility scripts
├── tests/            # Automated tests
├── index.html        # Main application interface
├── LICENSE           # License information
├── README.md         # Root project summary
└── sample.csv        # Sample data for import testing
```

## Directory Summaries

- **archive/** – Previous build snapshots for rollback.
- **backup/** – Backup copies of key files.
- **css/** – Contains the global `styles.css` stylesheet.
- **docs/** – Changelogs, workflow notes, roadmap, and future planning documentation. Includes the [UI Style Guide](ui_style_guide.md).
- **images/** – Project icons and favicons.
- **js/** – All JavaScript modules powering the application, including `customMapping.js` for regex-based field mapping.
- **scripts/** – Utility scripts.
- **tests/** – Automated tests.
- **index.html** – Entry point and user interface for the tool.
- **README.md** – Root project summary.
- **sample.csv** – Sample data for import testing.

- `docs/migration_roadmap.md` — steps to provider-agnostic model
