# Security Policy

## Supported version

Security fixes target the latest version on the default branch.

## Reporting a vulnerability

Do not publish sensitive vulnerability details in a public issue. Use the repository owner's private security reporting channel when available.

Include:

- Affected commit or version.
- Reproduction steps.
- Expected and actual behavior.
- Security impact.
- A minimal test file when file parsing is involved.

## Trust model

NFC Tap Log is a static browser application with no backend. Its primary protections are:

- No ordinary runtime CDN/API connection (`connect-src 'none'`). Optional peer-to-peer WebRTC must be explicit in the product specification and must not introduce hidden signaling/STUN/TURN services.
- Explicitly pinned and embedded third-party files.
- Committed `dependencies.lock.json` tarball SHA-256 values verified before embedding.
- SHA-256 records in the generated dependency manifest.
- No analytics, telemetry, remote fonts, or silent update checks.
- User-initiated downloads rather than automatic uploads.

A generated HTML file is executable code. Distribute it through a trusted channel and verify hashes for high-trust workflows.

If an app uses `components/webrtc-qr-pairing.html`, treat the paired browser as an explicit data recipient. “No server upload” does not mean “data never leaves this device.” Keep the manual signaling and `iceServers: []` boundary visible in the UI/help text, and do not silently add STUN/TURN later.

## Tag URL input

NFC Tap Log treats URL-fragment payloads as untrusted input. The app must:

- Validate payload version, item ID, decoded text length, and interval range before persistence.
- Render tag-derived strings as text, never as HTML.
- Reject malformed Base64URL and unsupported payloads without exposing stack traces to users.
- Never create a log event merely because a tag URL opened.
- Never auto-navigate to arbitrary URLs derived from tag data.
- Treat tag URLs as public data and never encourage passwords or other secrets in tag fields.

## Dependency review

Before adding or upgrading a package:

- Confirm the package identity and exact version.
- Review the scheduled dependency Issue; never treat an available update as an automatic approval to upgrade.
- Review its license and required notices.
- Inspect the browser bundle and package scripts.
- Confirm every runtime support asset is embedded.
- Refresh the selected lock entry with the dependency scripts; never hand-edit a lock hash to bypass a mismatch.
- Rebuild with a clean cache.
- Test with the network disabled.

## Web NFC reading and writing

v1.0.0 reads and writes only the NFC Tap Log Portable Tag URL format. It is not a general free-form NFC reader/writer. QR generation encodes the same URL locally and does not send it to a QR service.

- Direct NFC reading/writing is enabled only when `NDEFReader` is available in a secure top-level context.
- Both scan and write operations are explicitly user initiated.
- Pending scans/writes can be aborted with `AbortController`.
- Existing NDEF data may be overwritten only after the user starts the disclosed write flow.
- Scanned tags are treated as untrusted input. The app accepts only URL records for the current NFC Tap Log origin/path with a valid Portable Tag fragment.
- The app never auto-opens arbitrary URLs found on scanned tags.
- Read-back verification compares Portable Tag ID, name, action label, and interval so stale tags are not silently accepted.
- NFC hardware serial numbers are not used as item identities or persisted.
- The app does not treat NFC transfer as a network upload and does not relax `connect-src 'none'`.
- Raw Web NFC exceptions remain in a collapsed technical-details area; the main UI uses plain-language messages.

## Backup file handling

JSON backup files are untrusted local input. v1.0.0 validates the whole backup before changing IndexedDB.

- Require `formatVersion: 1` and the NFC Tap Log app slug.
- Reject malformed IDs, dates, text over limits, duplicate item/event IDs, and orphan events.
- Limit the selected JSON file to 25 MB before parsing.
- Add mode preserves existing stable IDs rather than silently overwriting local data.
- Replace mode requires an additional destructive confirmation before clearing object stores.
- Backup contents are never uploaded or sent through `fetch`, XHR, WebSocket, or another external API.
- CSV is export-only and cannot mutate application state.
