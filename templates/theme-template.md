# Theme System Template

This template provides a structure for implementing user-customizable themes in web applications, based on StackTrackr's design system.

## 1. Theme Structure

### Base Theme Object
```javascript
const themeTemplate = {
  name: "Theme Name",
  id: "theme-id",
  version: "1.0",
  
  colors: {
    // Primary Brand Colors
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    secondary: "#8b93a6",
    secondaryHover: "#6b7280",
    
    // Status Colors
    success: "#059669",
    successHover: "#047857",
    info: "#0ea5e9",
    infoHover: "#0284c7",
    warning: "#d97706",
    warningHover: "#b45309",
    danger: "#dc2626",
    dangerHover: "#b91c1c",
    
    // Background Hierarchy
    background: "#e7edf2",
    backgroundElevated1: "#d7dfe6",
    backgroundElevated2: "#bec7cf",
    surface: "#d7dfe6",
    surfaceAlt: "#bec7cf",
    
    // Typography
    textPrimary: "#1b232c",
    textSecondary: "#344351",
    textMuted: "#6b7280",
    
    // Borders & Dividers
    border: "#cbd5e1",
    borderHover: "#94a3b8",
    
    // Special Purpose
    chipText: "#1b232c",
    disclaimerColor: "#d97706"
  },
  
  shadows: {
    small: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    medium: "0 4px 6px -1px rgb(0 0 0 / 0.15), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    large: "0 10px 15px -3px rgb(0 0 0 / 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
  },
  
  spacing: {
    xs: "0.2rem",
    sm: "0.4rem",
    md: "0.75rem",
    lg: "1.25rem",
    xl: "1.5rem"
  },
  
  radius: {
    default: "8px",
    large: "12px"
  },
  
  typography: {
    fontFamily: {
      body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      monospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem"
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700"
    }
  },
  
  transitions: {
    default: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
  }
};
```

## 2. CSS Custom Properties Implementation

```css
/* Theme CSS Variables */
.theme-{id} {
  /* Primary Colors */
  --primary: var(--theme-primary, #3b82f6);
  --primary-hover: var(--theme-primary-hover, #2563eb);
  --secondary: var(--theme-secondary, #8b93a6);
  --secondary-hover: var(--theme-secondary-hover, #6b7280);
  
  /* Status Colors */
  --success: var(--theme-success, #059669);
  --success-hover: var(--theme-success-hover, #047857);
  --info: var(--theme-info, #0ea5e9);
  --info-hover: var(--theme-info-hover, #0284c7);
  --warning: var(--theme-warning, #d97706);
  --warning-hover: var(--theme-warning-hover, #b45309);
  --danger: var(--theme-danger, #dc2626);
  --danger-hover: var(--theme-danger-hover, #b91c1c);
  
  /* Background Colors */
  --bg: var(--theme-background, #e7edf2);
  --bg-elev-1: var(--theme-background-elevated-1, #d7dfe6);
  --bg-elev-2: var(--theme-background-elevated-2, #bec7cf);
  --surface: var(--theme-surface, #d7dfe6);
  --surface-alt: var(--theme-surface-alt, #bec7cf);
  
  /* Typography Colors */
  --text: var(--theme-text-primary, #1b232c);
  --text-muted: var(--theme-text-secondary, #344351);
  
  /* Other Design Tokens */
  --radius: var(--theme-radius, 8px);
  --transition: var(--theme-transition, all 0.2s cubic-bezier(0.4, 0, 0.2, 1));
}
```

## 3. Theme Management System

```javascript
class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.activeTheme = null;
  }
  
  registerTheme(theme) {
    if (!theme.id || !theme.name) {
      throw new Error('Theme must have id and name properties');
    }
    this.themes.set(theme.id, theme);
  }
  
  applyTheme(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme '${themeId}' not found`);
    }
    
    // Remove existing theme classes
    document.documentElement.classList.remove(...this.themes.keys().map(id => `theme-${id}`));
    
    // Add new theme class
    document.documentElement.classList.add(`theme-${theme.id}`);
    
    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--theme-${key}`, value);
    });
    
    this.activeTheme = theme;
    localStorage.setItem('active-theme', theme.id);
  }
  
  getCurrentTheme() {
    return this.activeTheme;
  }
  
  getRegisteredThemes() {
    return Array.from(this.themes.values());
  }
}
```

## 4. Built-in Themes

### Light Theme (Default)
```javascript
const lightTheme = {
  id: "light",
  name: "Light",
  colors: {
    // Use default values from themeTemplate
    ...themeTemplate.colors
  }
};
```

### Dark Theme
```javascript
const darkTheme = {
  id: "dark",
  name: "Dark",
  colors: {
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    background: "#1a1f2e",
    backgroundElevated1: "#242938",
    backgroundElevated2: "#2d3446",
    surface: "#242938",
    surfaceAlt: "#2d3446",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    border: "#2d3446",
    borderHover: "#3d4659"
    // ... other color overrides
  }
};
```

### Sepia Theme
```javascript
const sepiaTheme = {
  id: "sepia",
  name: "Sepia",
  colors: {
    background: "#f5e6d3",
    backgroundElevated1: "#efe0c9",
    backgroundElevated2: "#e6d5bc",
    surface: "#efe0c9",
    surfaceAlt: "#e6d5bc",
    textPrimary: "#433422",
    textSecondary: "#665137",
    textMuted: "#7d654c"
    // ... other color overrides
  }
};
```

## 5. User Theme Creation

### Theme Builder Interface
```javascript
class ThemeBuilder {
  constructor(baseTheme = themeTemplate) {
    this.theme = { ...baseTheme };
  }
  
  setName(name) {
    this.theme.name = name;
    return this;
  }
  
  setColors(colors) {
    this.theme.colors = { ...this.theme.colors, ...colors };
    return this;
  }
  
  setShadows(shadows) {
    this.theme.shadows = { ...this.theme.shadows, ...shadows };
    return this;
  }
  
  build() {
    if (!this.theme.name) {
      throw new Error('Theme must have a name');
    }
    this.theme.id = this.theme.name.toLowerCase().replace(/\s+/g, '-');
    return { ...this.theme };
  }
}
```

## 6. Usage Example

```javascript
// Initialize theme manager
const themeManager = new ThemeManager();

// Register built-in themes
themeManager.registerTheme(lightTheme);
themeManager.registerTheme(darkTheme);
themeManager.registerTheme(sepiaTheme);

// Create and register a custom theme
const customTheme = new ThemeBuilder()
  .setName('Ocean')
  .setColors({
    primary: '#0891b2',
    primaryHover: '#0e7490',
    background: '#ecfeff',
    backgroundElevated1: '#cffafe',
    backgroundElevated2: '#a5f3fc'
  })
  .build();

themeManager.registerTheme(customTheme);

// Apply theme
themeManager.applyTheme('ocean');
```

## 7. Theme Migration and Validation

```javascript
class ThemeValidator {
  static validateTheme(theme) {
    // Required properties
    const required = ['id', 'name', 'colors'];
    required.forEach(prop => {
      if (!theme[prop]) {
        throw new Error(`Missing required theme property: ${prop}`);
      }
    });
    
    // Color format validation
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (!value.match(/^#[0-9A-Fa-f]{6}$/)) {
        throw new Error(`Invalid color format for ${key}: ${value}`);
      }
    });
    
    return true;
  }
  
  static migrateTheme(oldTheme, currentVersion) {
    // Add migration logic here
    return { ...oldTheme, version: currentVersion };
  }
}
```

## 8. Theme Export/Import

```javascript
class ThemePortability {
  static export(theme) {
    return JSON.stringify(theme);
  }
  
  static import(themeJson) {
    const theme = JSON.parse(themeJson);
    ThemeValidator.validateTheme(theme);
    return theme;
  }
}
```

## Best Practices

1. **Color Relationships**
   - Maintain consistent contrast ratios
   - Use primary color as base for hover states
   - Keep text colors readable on all backgrounds

2. **Performance**
   - Use CSS custom properties for dynamic values
   - Cache theme objects
   - Minimize runtime theme switches

3. **Accessibility**
   - Ensure WCAG 2.1 compliance for all themes
   - Test color combinations for color blindness
   - Provide high contrast options

4. **Maintenance**
   - Document color usage and relationships
   - Version theme definitions
   - Include theme metadata (author, version, description)

5. **User Experience**
   - Preview themes before applying
   - Save user preferences
   - Provide theme reset option

This template provides a foundation for implementing a flexible, maintainable, and user-customizable theme system while maintaining StackTrackr's design principles.
