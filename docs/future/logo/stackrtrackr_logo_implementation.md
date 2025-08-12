# StackrTrackr Logo Implementation Guide

## Overview
This guide provides everything you need to implement the StackrTrackr logo with automatic light/dark mode switching and responsive design.

## Features
- ✅ **Dual Theme Support**: Automatic light/dark mode detection
- ✅ **Responsive Design**: Scales from desktop to mobile
- ✅ **Premium Styling**: Gold and silver gradients with drop shadows
- ✅ **Cross-Browser Compatible**: Works in all modern browsers

---

## 1. SVG Logo Code

```svg
<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" style="max-width: 800px;">
  <defs>
    <!-- Light Mode Gradients -->
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="30%" stop-color="#FFA500"/>
      <stop offset="70%" stop-color="#B8860B"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
    
    <linearGradient id="silverLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F8F8FF"/>
      <stop offset="30%" stop-color="#E5E5E5"/>
      <stop offset="70%" stop-color="#C0C0C0"/>
      <stop offset="100%" stop-color="#A0A0A0"/>
    </linearGradient>
    
    <!-- Dark Mode Gradients -->
    <linearGradient id="goldDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFED4E"/>
      <stop offset="30%" stop-color="#FFD700"/>
      <stop offset="70%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#CC8400"/>
    </linearGradient>
    
    <linearGradient id="silverDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#F5F5F5"/>
      <stop offset="70%" stop-color="#E0E0E0"/>
      <stop offset="100%" stop-color="#C0C0C0"/>
    </linearGradient>
    
    <!-- Drop Shadow Filter -->
    <filter id="dropShadow">
      <feDropShadow dx="3" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
    
    <!-- Gold Glow Filter -->
    <filter id="goldGlow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Light Mode Group -->
  <g class="light-mode">
    <!-- Main title -->
    <g filter="url(#dropShadow)">
      <text x="50" y="80" font-family="Arial, sans-serif" font-size="72" font-weight="bold">
        <tspan fill="url(#silverLight)">Stackr</tspan><tspan fill="url(#goldLight)">Trackr</tspan>
      </text>
    </g>
    
    <!-- Tagline with glow -->
    <g filter="url(#goldGlow)">
      <text x="50" y="130" font-family="Arial, sans-serif" font-size="32" fill="#FFD700" opacity="0.6">
        Track Your Stack. Your Way.
      </text>
      <text x="50" y="130" font-family="Arial, sans-serif" font-size="32" fill="url(#silverLight)">
        Track Your Stack. Your Way.
      </text>
    </g>
  </g>
  
  <!-- Dark Mode Group -->
  <g class="dark-mode" style="display: none;">
    <!-- Main title -->
    <g filter="url(#dropShadow)">
      <text x="50" y="80" font-family="Arial, sans-serif" font-size="72" font-weight="bold">
        <tspan fill="url(#silverDark)">Stackr</tspan><tspan fill="url(#goldDark)">Trackr</tspan>
      </text>
    </g>
    
    <!-- Tagline with glow -->
    <g filter="url(#goldGlow)">
      <text x="50" y="130" font-family="Arial, sans-serif" font-size="32" fill="#FFED4E" opacity="0.7">
        Track Your Stack. Your Way.
      </text>
      <text x="50" y="130" font-family="Arial, sans-serif" font-size="32" fill="url(#silverDark)">
        Track Your Stack. Your Way.
      </text>
    </g>
  </g>
</svg>
```

---

## 2. Required CSS

Add this CSS to your stylesheet or in a `<style>` tag:

```css
/* StackrTrackr Logo Styles */
.stackr-logo {
  max-width: 800px;
  width: 100%;
  height: auto;
}

/* Theme switching */
.light-mode { 
  display: block; 
}

.dark-mode { 
  display: none; 
}

/* Automatic dark mode detection */
@media (prefers-color-scheme: dark) {
  .light-mode { 
    display: none; 
  }
  .dark-mode { 
    display: block; 
  }
}

/* Manual theme control */
[data-theme="dark"] .light-mode { 
  display: none; 
}

[data-theme="dark"] .dark-mode { 
  display: block; 
}

[data-theme="light"] .light-mode { 
  display: block; 
}

[data-theme="light"] .dark-mode { 
  display: none; 
}

/* Responsive scaling */
@media (max-width: 768px) {
  .stackr-logo text { 
    font-size: 0.8em; 
  }
}

@media (max-width: 480px) {
  .stackr-logo text { 
    font-size: 0.6em; 
  }
}
```

---

## 3. Implementation Methods

### Method 1: Automatic Theme Detection (Recommended)
```html
<header class="site-header">
  <div class="logo-container">
    <!-- Paste SVG code here with class="stackr-logo" -->
    <svg class="stackr-logo" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
      <!-- SVG content -->
    </svg>
  </div>
</header>
```

### Method 2: Manual Theme Control
```html
<div data-theme="light">
  <svg class="stackr-logo" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
    <!-- SVG content -->
  </svg>
</div>
```

### Method 3: With JavaScript Theme Switcher
```html
<button onclick="toggleTheme()">Toggle Theme</button>
<div id="logo-container">
  <svg class="stackr-logo" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
    <!-- SVG content -->
  </svg>
</div>

<script>
function toggleTheme() {
  const container = document.getElementById('logo-container');
  const currentTheme = container.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  container.setAttribute('data-theme', newTheme);
}
</script>
```

---

## 4. Quick Setup Guide

1. **Copy the SVG code** from section 1 above
2. **Add the CSS** from section 2 to your stylesheet
3. **Paste the SVG** into your HTML where you want the logo
4. **Add the class** `stackr-logo` to your SVG element
5. **Test responsiveness** by resizing your browser window

---

## 5. Customization Options

### Adjust Logo Size
```css
.stackr-logo {
  max-width: 600px; /* Change from 800px */
}
```

### Force Light or Dark Mode
```css
/* Always use light mode */
.dark-mode { display: none !important; }

/* Always use dark mode */
.light-mode { display: none !important; }
.dark-mode { display: block !important; }
```

### Custom Breakpoints
```css
@media (max-width: 1024px) {
  .stackr-logo text { font-size: 0.9em; }
}

@media (max-width: 600px) {
  .stackr-logo text { font-size: 0.7em; }
}
```

---

## 6. Troubleshooting

### Logo Not Displaying
- Ensure the SVG has the `stackr-logo` class
- Check that the CSS is properly loaded
- Verify there are no console errors

### Theme Not Switching
- Make sure the CSS theme rules are included
- Check browser support for `prefers-color-scheme`
- Verify the `data-theme` attribute is set correctly

### Responsive Issues
- Confirm the `viewBox` attribute is set to `"0 0 800 200"`
- Check that `width="100%"` and `height="auto"` are set
- Ensure the CSS responsive rules are applied

---

## 7. Browser Support

- ✅ Chrome 76+
- ✅ Firefox 67+
- ✅ Safari 12.1+
- ✅ Edge 79+

---

## Notes

- The logo automatically detects your user's system theme preference
- You can override the automatic detection with manual theme controls
- The SVG scales perfectly from desktop to mobile
- All gradients and effects are optimized for performance
- The logo maintains crisp quality at all sizes