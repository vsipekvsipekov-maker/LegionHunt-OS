# LegionHunt OS — Global Search 1.0

- Unified `/api/search` endpoint for Team, CRM, Academy and Wiki.
- Real Ctrl/Cmd+K command palette with debounced search.
- Keyboard navigation with Up/Down, Enter and Escape.
- Clickable topbar search on desktop and mobile.
- Search result grouping and module metadata.
- Removed the conflicting Wiki Ctrl+K listener so the global palette is the single system shortcut.

Validation:
- TypeScript: passed (`tsc --noEmit`).
- ESLint for new/modified core search files: passed.
- Production build could not download the Linux SWC binary in the isolated build environment.
