# StakTrakr — Frequently Asked Questions

Answers to the most common questions about privacy, data security, backups, and how the app works. The full interactive version is also available inside the app under **Settings → FAQ**.

---

**🔒 YOUR DATA & PRIVACY**

---

**Who can see my inventory?**

Only you. Your inventory is stored entirely on your own device using your browser's localStorage (and IndexedDB for images). No data is ever sent to any server unless you explicitly choose to use a cloud backup feature like Dropbox. Even then, the data is encrypted on your device *before* it leaves — the cloud provider receives an encrypted blob they cannot read.

---

**Can the developer see my data?**

No. There is no server-side component, no database, and no analytics that transmit your inventory. The only outbound network requests the app makes are:

- Spot price lookups from public metal pricing APIs (no inventory data included)
- Numista / PCGS catalog searches when you use those features
- Version check against staktrakr.com/version.json (no inventory data included)
- Exchange rate data from Open Exchange Rates (no inventory data included)

---

**Does this app use cookies or tracking?**

**No cookies. No advertising SDKs. No tracking pixels.** The app uses browser localStorage and IndexedDB solely to store your inventory and preferences on your own device.

When you use the hosted version at staktrakr.com (served via Cloudflare Pages), Cloudflare Web Analytics is active at the network edge. It collects aggregated, anonymous page-view metrics — visit counts, countries, browser types — without cookies and without building individual user profiles. No inventory data is ever included. If you download and run the app locally from a ZIP file, no analytics run at all.

---

**What happens if I clear my browser history?**

If you clear browser *storage* (not just history), your inventory data in localStorage will be deleted. Browser history alone does not affect your data. Export a backup regularly using the ZIP or vault export options.

---

**Is this app safe from viruses or malware?**

StakTrakr is open-source — anyone can read the code at https://github.com/lbruton/StakTrakr. There is no hidden code. The app loads several trusted third-party libraries (Chart.js, PapaParse, jsPDF, Bootstrap) from CDNs. Keep your browser and OS updated, and be cautious about browser extensions with broad permissions.

---

**📦 BACKUPS & EXPORT**

---

**How do I get my data out if I want to leave?**

Your data is never locked in. Export at any time via **Inventory → Export**:

- **CSV** — opens in Excel, Google Sheets, or any spreadsheet app
- **PDF** — a formatted report for printing or archiving
- **ZIP backup** — a complete snapshot including settings, importable into any future StakTrakr install
- **Encrypted vault (.stvault)** — a password-protected backup file

---

**Will this app keep working in the future?**

Yes. Because the app runs entirely in your browser with no server requirement, a downloaded copy will continue to work indefinitely — even offline — as long as browsers support standard web APIs. You can always save a ZIP and open index.html locally.

---

**What if the developer stops maintaining it?**

The app is MIT licensed and open source. Anyone in the community can fork the project and continue it. Your data remains yours in exportable formats regardless. The offline-first, single-file design means the app won't simply stop working the way a subscription service would.

---

**☁️ CLOUD STORAGE**

---

**If I use Dropbox, can Dropbox see my data?**

No. Your inventory is encrypted on your device before it is uploaded. Dropbox only ever receives an encrypted file. Encryption uses AES-256-GCM with a key derived from your password via PBKDF2-SHA256 with 100,000 iterations, implemented entirely in your browser using the Web Crypto API. The cloud provider receives only ciphertext and a random salt — never your password or plaintext data.

---

**What is encryption and how does it protect me?**

Encryption transforms your data into unreadable scrambled text. Without the correct password, it is mathematically impossible to read — even if the cloud provider is breached. Think of it like a safe deposit box: the bank holds the box, but only you have the key.

**Important:** If you lose your vault password, the data cannot be recovered. Store your password somewhere safe.

---

**🛡️ SECURITY**

---

**Is my data safe from hackers?**

Your local data is protected by your browser's same-origin security model — other websites cannot read it. The practical risks are the same as any local software: malware on your device, browser extensions with broad permissions, or physical access to an unlocked device. Standard device hygiene — OS updates, reputable extensions only, device lock screens — provides strong protection.

---

**💡 ABOUT THE APP**

---

**How is this different from other precious metals apps?**

Most precious metals apps store your data on their servers and require accounts. StakTrakr is different:

- **Fully local** — your data never leaves your device unless you choose cloud backup
- **No account required** — no email, no password to create, no profile
- **Open source** — the code is publicly readable; there are no hidden behaviors
- **No subscription** — the core app is free forever; optional sponsor perks cover infrastructure costs
- **Works offline** — once loaded, the app works without internet (spot prices require connectivity)
- **Portable** — download a ZIP, open index.html, and it runs anywhere

---

**Does this app have any subscriptions or costs?**

**The core app is free and always will be.** Every feature — full inventory management, spot price sync, CSV/PDF/ZIP export, encrypted vault backups, Dropbox cloud sync, Numista/PCGS integration — is included with no account required and no paywall.

Running the app costs real money: the domain renewal, and the API provider that supplies hourly live spot prices. Sponsoring at $1/month or more on GitHub Sponsors (https://github.com/sponsors/lbruton) helps cover those costs directly.

As a thank-you, sponsors will get access to **optional infrastructure perks** as they are built:

- **Now:** Dropbox cloud backup is free for everyone
- **Coming for sponsors:** a hosted cloud storage key (Supabase-backed) — same encryption as Dropbox, no third-party account needed
- **Further out:** early access to real-time encrypted cloud sync, as the user base and infrastructure grow

None of these remove features from the free tier — they are new infrastructure that costs money to operate. If sponsorship never materializes, the core app stays exactly as it is.

---

**⚖️ HONEST LIMITATIONS**

We believe in transparency. Here are real trade-offs you should know about.

---

**localStorage can be cleared unexpectedly**

Browser localStorage can be cleared by "Clear site data" in browser settings, private/incognito sessions, or **iOS Safari storage eviction** (Apple may delete it automatically when the device is low on storage). Export a backup regularly, especially on iOS.

---

**Opening via file:// protocol on some browsers**

The app is designed to work when opening index.html directly from your filesystem, but a small number of browser configurations restrict localStorage persistence in that context. If data isn't persisting, try a local web server or use the hosted version at staktrakr.com.

---

**No formal third-party security audit — but here's what we do run**

StakTrakr is a one-person project. A paid independent cryptographic audit hasn't been commissioned. But the codebase is not unreviewed — every commit runs through a layered set of automated checks:

- **Codacy** — continuous code quality gate, A+ rating maintained on every PR
- **CodeQL** — GitHub's semantic analysis, scans for security vulnerabilities on every push
- **Semgrep** — static analysis for common security anti-patterns
- **PMD** — additional static analysis for code quality issues
- **ESLint** — JavaScript linting with security-aware rules
- **GitHub Copilot & Codex** — AI-assisted code review on pull requests

Development is also assisted by **Claude Code** (Anthropic's AI coding assistant), explicitly instructed to flag security concerns during implementation.

This is the realistic security posture of a well-maintained open-source personal project: comprehensive automated tooling, no paid human audit. The source is fully public if you want to verify the encryption implementation yourself.

---

**Only Dropbox is active — other cloud providers are coming soon**

**Dropbox is the only fully active cloud backup provider.** The Cloud tab in Settings also shows placeholder cards for four future providers: Google Drive, OneDrive, pCloud, and Box. These are shown to communicate the roadmap, not as functional options. All will use the same client-side AES-256-GCM encryption as Dropbox — the provider never sees your plaintext data.

---

**Spot prices are reference data, not transaction prices**

Spot prices represent the theoretical melt value of metal — not buy/sell prices from a dealer. Actual transaction prices differ due to dealer premiums, bid/ask spreads, and market conditions. "Melt Value" is a reference floor, not a guaranteed sale price.

---

**📄 MORE INFORMATION**

- Privacy Policy: https://staktrakr.com/privacy.html
- Source Code: https://github.com/lbruton/StakTrakr
- Community: https://www.reddit.com/r/staktrakr/
- GitHub Issues: https://github.com/lbruton/StakTrakr/issues
- GitHub Sponsors: https://github.com/sponsors/lbruton

---

*Special thanks to the r/Silverbugs community for the feedback, bug reports, and encouragement that shaped this app.*
