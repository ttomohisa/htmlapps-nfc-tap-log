# Changelog

## [1.0.1] - 2026-10-08

- Add editable, sanitized filenames for CSV, JSON backup, and QR PNG exports.
- Neutralize spreadsheet-formula prefixes in CSV while preserving original logs and JSON.
- Prevent stale backup reads from replacing newer selections and prevent repeated restore submissions.
- Normalize header language controls and update bilingual Help.
- Adopt template cb908779 build/root-HTML behavior and standard Cloudflare PR preview/cleanup.
- Add dependency-free regression tests for exports, restore races, and header contracts.

## [1.0.0] - 2026-09-14

### Changed

- Promote NFC Tap Log from release candidate to the first stable release.
- Change the header metadata from a feature/privacy list to product copy: Japanese `NFCタグで、作業履歴を記録`, English `Log routine work with NFC tags`.
- Finalize README and Japanese README for the stable release and add current UI screenshots.
- Switch app metadata, header badge, standalone manifests, and documentation to v1.0.0.

### Verified

- PC and mobile layout, Japanese/English UI, empty/loading/success/error states, dialogs, fixed mobile action, and long text wrapping.
- Portable Tag URL handling, NFC read/write/verify flows, QR fallback, interval status, history/Undo, backup/restore, and destructive confirmations.
- `connect-src 'none'`, no runtime CDN/API dependencies, no unresolved build placeholders, and readable/self-extract consistency.
- Final favicon/header icon consistency and release screenshots.

## [0.9.0] - 2026-09-14

### Changed

- Treat the app as a release candidate and prioritize regression/UX work over new major workflows.
- Add a mobile fixed record action so the main logging button remains reachable on long item screens without covering content.
- Present regular dialogs as mobile bottom sheets on small screens while preserving safe-area and scrolling behavior.
- Move toast/Undo feedback above the mobile record action.
- Replace version-phase copy on Home with stable product copy.
- Replace IndexedDB terminology in general-user privacy cards/help with plain-language browser-local storage wording.
- Rewrite English/Japanese README files to match the established Browser Kitty repository structure used by PDF Organizer.

### Verified

- Japanese/English translation parity and unique DOM IDs.
- Portable Tag URL handling, NFC read/write/verify state markers, QR fallback markers, interval status markers, backup/restore markers, and destructive confirmations.
- `connect-src 'none'`, no runtime external URL references, and readable/self-extract consistency.

## [0.8.0] - 2026-09-14

### Added

- Add UTF-8 BOM history CSV export from Home data management.
- Add complete JSON backup with format version, app identity, export timestamp, items, and events.
- Add validated JSON restore with Add and Replace modes.
- Add stable-ID deduplication in Add mode so existing local item/event IDs are preserved.
- Add second confirmation before destructive Replace restore.
- Add confirmed delete-all for local items and history while preserving UI preferences.

### Changed

- Update Home with saved item/history counts and backup controls, including restore when the database is empty.
- Update help/privacy guidance to recommend JSON backup before browser site data is cleared.

## [0.7.0] - 2026-09-14

### Added

- Add home overview counts for overdue items, suggested-today items, and records created in the last seven days.
- Add item search across name, action, and local memo.
- Add home sorting by suggested timing, latest record, latest update, or name.
- Add a recent-records section showing the five latest events with direct navigation to each item.
- Add explicit handling when a Portable Tag URL contains older item data than the information edited in this browser.

### Changed

- Make suggested timing the default home sort so overdue and due items appear before less urgent items.
- Keep item editing, tag URL, QR, NFC rewriting, and verification reachable from each item detail screen without requiring an NFC scan.
- Update the release scope card and documentation for Home / Item Management.

## [0.6.0] - 2026-09-14

### Added

- Add interval status calculation from the latest record.
- Add explicit states for no interval, no record, days remaining, suggested-today, and days past the suggested interval.
- Add interval status badges to the home list and a detailed status panel on the item screen.

### Changed

- Keep interval wording as guidance rather than a hard deadline.
- Update the release scope card and documentation for Interval / Status.

## [0.5.0] - 2026-09-14

### Added

- Add fully local QR generation from the same Portable Tag URL used by NFC.
- Add QR preview and PNG saving on the item detail screen.
- Add a print-only NFC / QR label with item name and action.
- Add QR fallback guidance for devices without Web NFC.

### Changed

- Replace the ambiguous first-item illustration with an explicit NFC-labeled icon.
- Update help and documentation so NFC and QR are clearly two entry points to the same local record screen.

## [0.4.0] - 2026-09-14

### Added

- Add in-app Web NFC scanning with explicit start/cancel states.
- Add safe NFC Tap Log URL detection without auto-opening unrelated scanned URLs.
- Add read-back verification comparing item ID, name, action label, and interval.
- Add post-write “Read back & verify” flow.
- Add separate states for mismatched, unrelated, malformed, and unreadable NFC tags.

### Changed

- Expose NFC reading from both the empty/home state and the item verification flow on supported environments.
- Update help and documentation for direct NFC reading/writing and iPhone/file limitations.

## [0.3.0] - 2026-09-14

### Added

- Add direct Web NFC writing of the current Portable Tag URL as an NDEF URL record.
- Add explicit overwrite warning before starting an NFC write.
- Add NFC capability/secure-context detection with plain-language fallback guidance.
- Add pending-write cancellation through `AbortController`.
- Add waiting, success, and mapped failure states with collapsed technical error details.

### Changed

- Keep URL copy/open available on browsers that do not expose Web NFC.
- Update in-app help and documentation for Android NFC writing and iPhone/file limitations.

## [0.2.0] - 2026-09-14

- Add optional notes when recording an action.
- Add history date/note editing.
- Add record deletion with Undo and immediate record Undo.
- Add item editing and confirmed item deletion.
- Keep NFC tag URL generation and all record data fully local.


All notable changes to NFC Tap Log are documented here.

## [0.1.0] - 2026-09-14

### Added

- Initial Local Logging Core based on the Browser Kitty single-HTML template.
- IndexedDB persistence for items and events.
- Portable tag URL generation and validation.
- Explicit action recording with previous-date and elapsed-day display.
- Home item list and recent event history.
- Japanese and English UI.
- Local-only privacy boundary with no runtime external network dependency.
- Canonical NFC/log application icon shared by favicon and header, with a prominent “NFC” label.

### Fixed

- Hide the global error notice and other `[hidden]` UI elements reliably instead of leaving an empty warning icon visible.

### Not yet included

- Direct Web NFC reading/writing.
- QR fallback.
- History editing / Undo.
- Backup and restore.
