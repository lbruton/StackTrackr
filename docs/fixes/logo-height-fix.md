# Logo Height Fix

## Problem
- `index.html` defined `height="auto"` on the Stackr logo SVG, which is not a valid attribute value and produced browser warnings.

## Solution
- Removed the `height` attribute from the `<svg>` and rely on the CSS rule `.stackr-logo { height: auto; }` for sizing.

## Affected Files
- `index.html`
- `css/styles.css`

