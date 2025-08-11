# Custom Mapping Rule Engine Prototype

This document outlines the initial design for a client‑side rule engine that maps
incoming field names to StackTrackr's internal schema.

## Design Overview
- **Goal:** Allow users to define mapping rules using regular expressions.
- **Approach:** Implement a lightweight module (`js/customMapping.js`) that stores
  rules in memory. Each rule contains a regex and the target field name.
- **Usage:** Prototype buttons in the Settings → Custom Mapping card prompt the
  user for a regex and field, store the rule, and let them test a mapping against
  an arbitrary field name. Rules can also be cleared from this card.

## Research Notes
- Evaluated client‑side rules frameworks such as
  [json-rules-engine](https://github.com/CacheControl/json-rules-engine) and
  [RuleJS](https://github.com/NorthwoodsSoftware/RuleJS). These libraries offer
  powerful expression parsing but introduce significant payload size and
  complexity for the simple mapping use case.
- Given project constraints (no build step, minimal dependencies), a custom
  implementation was chosen for the prototype.

## Limitations
- Rules exist only in memory; they are not persisted to `localStorage` yet.
- No validation UI for regex patterns—invalid expressions are caught and logged.
- Mapping tests must be triggered manually, one field at a time.
- Conflicting or overlapping regex patterns are resolved by first match only.

Future work may include persistent storage, UI for managing rule sets, and
integration with import workflows.
