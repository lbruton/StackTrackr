# StackrTrackr - Proposed Development Roadmap

**Prepared by:** Gemini, Security Auditor
**Date:** August 13, 2025

## Introduction

This document outlines a strategic, non-committal roadmap for the future development of StackrTrackr. It synthesizes the project's existing ambitions with the findings from the comprehensive code audit conducted on August 13, 2025.

The roadmap is structured into logical phases, prioritizing foundational stability and security before moving on to major feature enhancements. This approach ensures the application remains robust, maintainable, and secure as it evolves.

---

## Phase 1: Foundational Improvements (Near-Term)

*Objective: Modernize the development workflow, strengthen the codebase, and establish a solid foundation for future features. This phase is critical for long-term maintainability and security.*

#### **1.1. Adopt Modern Development Tooling**
*   **Description:** Introduce a lightweight build tool like **Vite** and a package manager like **npm** or **yarn**.
*   **Benefit:** This will provide a local development server (eliminating `file://` issues), enable code minification, manage third-party libraries effectively, and unlock modern JavaScript features.

#### **1.2. Codebase Health & Refactoring**
*   **Description:** Systematically refactor the codebase to improve structure and reduce technical debt.
*   **Key Actions:**
    *   **Eliminate Global Namespace Pollution:** Encapsulate all modules into a single `StackrTrackr` global object.
    *   **Consolidate Constants:** Move all "magic strings" (DOM IDs, localStorage keys) into `constants.js`.
    *   **Enhance Search & Filtering:** Fully transition to the `fuzzy-search.js` and `filters.js` modules, deprecating older logic.

#### **1.3. Automated Testing Framework**
*   **Description:** Integrate a modern testing framework such as **Vitest** or **Jest**.
*   **Benefit:** This will allow for the creation of a suite of automated unit and integration tests, drastically improving code reliability and preventing regressions.

---

## Phase 2: Core Feature Enhancements (Mid-Term)

*Objective: Deliver high-value features to users, modernize the user interface, and expand the application's core capabilities.*

#### **2.1. UI/UX Modernization**
*   **Description:** Overhaul the user interface for better usability and a more modern feel.
*   **Key Actions:**
    *   **Dashboard View:** Create a main dashboard with key metrics and summary charts.
    *   **Improved Mobile Layout:** Implement a card-based view for the inventory on mobile devices.
    *   **UI Framework Evaluation:** Consider adopting a lightweight UI framework (e.g., Svelte, Lit) to improve reactivity and component management.

#### **2.2. Advanced Functionality**
*   **Description:** Introduce powerful new features for managing and analyzing inventory.
*   **Key Actions:**
    *   **Bulk Editing:** Allow users to select multiple items and edit them simultaneously.
    *   **Advanced Charting:** Add new chart types, such as a historical chart showing the portfolio's total value over time.
    *   **Cost Basis Tracking:** Implement lot tracking (e.g., FIFO, LIFO) for more accurate profit/loss calculations.
    *   **Multi-Currency Support:** Add the ability to track purchases in different currencies with automatic conversion to a user-selected primary currency.

#### **2.3. Deeper API Integrations**
*   **Description:** Move from CSV-based imports to direct API integrations for more seamless data management.
*   **Key Actions:**
    *   **Numista API Integration:** Allow users to connect their Numista API key to fetch item details and values directly.
    *   **Expand Catalog Providers:** Add support for other data sources and catalogs beyond Numista.

---

## Phase 3: Data, Security & Connectivity (Long-Term)

*Objective: Provide users with secure, flexible, and powerful options for managing their data across devices.*

#### **3.1. Secure Cloud Sync**
*   **Description:** Implement optional, **end-to-end encrypted** synchronization with major cloud storage providers.
*   **Benefit:** This is a major value-add, allowing users to securely access and manage their inventory from any device without compromising their privacy.
*   **Potential Providers:** Google Drive, Dropbox, iCloud.

#### **3.2. Optional Database Backend**
*   **Description:** For power users, offer an optional integration with a remote database solution like **Turso (using libSQL)**.
*   **Benefit:** This provides a robust, scalable, and fast backend for users with very large collections or those who want to access their data programmatically.

#### **3.3. Encrypted Backups**
*   **Description:** Enhance the existing backup functionality to produce a password-protected, encrypted backup file.
*   **Benefit:** This adds a critical layer of security for users who store their backup files in potentially insecure locations.

---

## Security: An Ongoing Priority

Security is not a phase but a continuous commitment. All development, regardless of the phase, will adhere to the following principles:

*   **Dependency Audits:** Regularly scan all third-party libraries for known vulnerabilities.
*   **End-to-End Encryption:** Any feature that transmits or stores user data remotely **must** use strong, end-to-end encryption where the user holds the key.
*   **Secure Coding Practices:** Continue to enforce best practices, such as consistent input sanitization, to prevent vulnerabilities like XSS.
