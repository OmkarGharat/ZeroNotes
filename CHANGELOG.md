# Changelog

All notable changes to ZeroNotes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

---

## [3.1.0] - 2026-02-28

### Added
- **Pin Notes** — Pin up to 4 notes to the top of the home page
  - Pin/unpin toggle button on note cards (appears on hover)
  - Persistent pin badge and accent border on pinned cards
  - Separate "Pinned" and "All Notes" sections on the home page
  - Pin limit enforced at 4; disabled button with tooltip when limit reached
  - Pinned state persists in localStorage via `pinned` field on `Note` type
- **Auto-Save** — Debounced auto-save (1.5s delay) that saves automatically as you type
  - Enabled by default; toggle on/off in the Settings modal
  - Save button shows "Saved ✓" indicator after auto-save
  - New notes are auto-created and navigated to edit URL
- **Settings Modal** — Gear icon on homepage opens a settings panel
  - Auto-Save toggle switch
  - Coming Soon placeholders for Google Drive, Mega, GitHub, GitLab
  - Settings persisted in localStorage
- **CHANGELOG.md** — Project changelog tracking all features, fixes, and changes

### Fixed
- Clicking on a line in the editor now correctly places the cursor at the clicked position

---

## [3.0.0] - 2026-02-08

### Added
- BlockSuite editor integration (replaced Quill)
- Dark mode support with CSS class-based toggling
- Firebase sharing (publish/unpublish notes with public links)
- Markdown download export
- Beta banner component
- SEO meta tags and sitemap generation

### Fixed
- Dark mode variable overrides for all BlockSuite widgets (slash menu, format bar, modals)
- Editor placeholder overlap after merging lines
