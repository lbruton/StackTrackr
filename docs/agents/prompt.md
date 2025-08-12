# StackrTrackr Development Prompt

You're working on **StackrTrackr v3.04.40+**, a client-side precious metals inventory web app. Your job is to pick up a development task and implement it efficiently.

## Quick Orientation (3 steps)

1. **Read context**: `docs/agents/agents.ai` - Essential project info, patterns, current state
2. **Pick task**: `docs/roadmap.md` - Find an unassigned patch entry
3. **Reference functions**: `docs/functionstable.md` - Function lookup when needed

## Core Files
- `index.html` - Main UI
- `js/inventory.js` - CRUD operations  
- `js/events.js` - Event handlers
- `js/theme.js` - Dark/light/sepia themes
- `js/constants.js` - Version & config
- `css/styles.css` - All styling

## Workflow
1. **TEST FIRST**: Load `sample.csv`, verify current functionality works
2. **IMPLEMENT**: Make focused changes to relevant files
3. **TEST THEMES**: Verify dark, light, sepia modes all work
4. **UPDATE VERSION**: Bump `APP_VERSION` in `js/constants.js`
5. **DOCUMENT**: Add entry to `docs/changelog.md`, mark task complete in `docs/roadmap.md`

## Key Rules
- **Token efficiency**: Direct implementation, minimal explanations
- **High-conflict files**: `index.html`, `events.js`, `styles.css` (coordinate if others working)
- **Input sanitization**: Always use `replace(/[<>]/g, '')` on user input
- **Theme updates**: Call `updateThemeButton()` after `setTheme()`
- **Event listeners**: Use `safeAttachListener()` from `events.js`

## Testing Checklist
- [ ] Load sample.csv successfully
- [ ] CRUD operations work (add/edit/delete items)
- [ ] All 3 themes render correctly
- [ ] Mobile responsive
- [ ] Import/export functions
- [ ] Search and filtering

Ready to code! Start by reading `docs/agents/agents.ai` for full context, then pick a task from `docs/roadmap.md`.
