# APP_SPEC.md

## 1. Product identity

- **Name:** NFC Tap Log
- **Version:** v1.0.0
- **Repository:** `ttomohisa/htmlapps-nfc-tap-log`
- **One-sentence purpose:** Turn a tag URL attached to a physical object into a shortcut for checking the previous maintenance/routine date and recording the next action locally.
- **Primary users:** Individuals recording lightweight recurring work such as cleaning, replacement, inspection, watering, and replenishment.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Product principle

NFC Tap Log is not a general NFC reader/writer. The NFC tag is only the physical entry point to one object and one action.

```text
physical object
  -> NFC tag URL
  -> item screen
  -> check previous record
  -> press one record button
  -> history stays in this browser
```

The tag never stores the event history. History belongs to the local browser database.

## 3. v1.0.0 scope — Stable release

v1.0.0 freezes the core NFC Tap Log workflow as the first stable release. The focus is final regression, release assets, documentation accuracy, and preserving the simple “tap → check previous → record” flow rather than adding another major feature.

Required:

- Keep Portable Tag, local database, backup, NFC, QR, interval, and history formats compatible with v0.9.0.
- Keep the header version badge at v1.0.0 and use stable product copy rather than release-phase wording.
- Header metadata must describe the app itself: Japanese `NFCタグで、作業履歴を記録`, English `Log routine work with NFC tags`.
- Keep general-user privacy text plain; implementation details such as IndexedDB belong in technical documentation rather than primary cards.
- Preserve mobile bottom-sheet dialogs, fixed record action, safe-area padding, and toast placement from the release candidate.
- Preserve sufficient tap areas, long-name wrapping, keyboard/focus behavior, and Japanese/English parity.
- Preserve the empty, loading, success, warning, failure, and destructive-confirmation states.
- Verify NFC unsupported, insecure context, iframe, permission rejection, NFC unavailable, write/read failure, mismatched tag, malformed tag, and cancellation states remain understandable.
- Verify backup validation, Add/Replace restore, delete-all confirmation, and CSV/JSON exports.
- Keep README.md and README.ja.md in the established Browser Kitty repository format and include current screenshots.
- Include `assets/screenshot.png` and `assets/screenshot-en.png` captured from the current v1.0.0 UI with no modal or error state left open.
- Keep `connect-src 'none'`, no analytics/telemetry, and no runtime CDN/API dependencies.
- Produce and verify both readable and self-extracting single-HTML artifacts.

Not in v1.0.0:

- Cloud sync, accounts, household/team sharing, or server storage.
- Push notifications or scheduled reminders.
- Multi-action tags.
- NFC hardware serial-number tracking.
- Low-level NFC protocols outside NDEF.
- New data formats or migrations that would make v0.9.0 backups incompatible.

## 4. NFC read contract

Supported general scan path:

```text
published HTTPS page
-> supported Android browser exposes NDEFReader
-> user selects "Read NFC tag"
-> explicit "Start reading"
-> browser permission prompt if needed
-> scan is scheduled
-> user holds a compatible NDEF tag near phone
-> reading event fires
-> app validates an NFC Tap Log URL record
-> user opens the matching item
```

Supported verification path:

```text
item screen (or successful write)
-> "Verify this NFC tag"
-> scan tag
-> validate Portable Tag URL
-> compare id + name + action + interval
-> show exact match or mismatch
```

Opening a tag never creates a log automatically. The user must still press the item's record-action button after doing the real task.

## 5. NFC availability rules

Direct NFC reading/writing is available only when all of the following are true:

- The page is not opened through `file://`.
- `window.isSecureContext` is true.
- The app is running as the top-level page, not inside an iframe.
- `NDEFReader` exists in the page environment.

If any condition fails, the core logging and tag URL features remain usable. Do not show a non-working NFC action without explanation.

The application does not promise Web NFC on iPhone Safari. iPhone users can still open a prepared NFC URL tag through the OS and use the same local logging UI.

## 6. NFC scan handling

The reader uses:

```js
const ndef = new NDEFReader();
await ndef.scan({ signal });
```

The application registers both:

```text
reading
readingerror
```

The scan is canceled with `AbortController` when the user closes/cancels the flow or when a tag result has been handled.

Common scan-start errors:

- `NotAllowedError`: permission rejected/unavailable.
- `NotSupportedError`: compatible NFC/Web NFC unavailable.
- `InvalidStateError`: another scan is already active.
- `AbortError`: user cancellation; not shown as an error.
- Other exceptions: generic explanation plus collapsed technical detail.

A `readingerror` event means a nearby tag could not be read reliably; present a retry state rather than a developer exception.

## 7. NFC Tap Log tag detection

The reader inspects NDEF records and only processes URL records.

A tag is considered an NFC Tap Log tag when:

1. A URL record can be decoded as UTF-8.
2. The URL has the same origin and path as the currently running NFC Tap Log page.
3. Its fragment passes the Portable Tag validation contract.

The application must never automatically navigate to arbitrary URLs found on NFC tags.

Result classes:

- **valid** — current app URL + valid Portable Tag payload.
- **malformed** — current app URL but invalid/unsupported Portable Tag payload.
- **not-app** — no usable NFC Tap Log URL record.

## 8. Read-back verification

Verification compares the scanned portable fields to the item currently being verified:

```text
id
name
actionLabel
intervalDays
```

A matching ID with an older name/action/interval is a mismatch. This intentionally detects tags that were written before the item was edited.

Local-only memo and event history are not tag fields and are not part of verification.

## 9. Portable tag URL

Conceptual form:

```text
<current-page-url>#v=1&i=<id>&n=<base64url-utf8>&a=<base64url-utf8>&d=<days>
```

Rules:

- `v` must be `1`.
- `i` is a URL-safe random ID generated from cryptographically secure random bytes.
- `n` is the item name encoded as UTF-8 then Base64URL.
- `a` is the action label encoded as UTF-8 then Base64URL.
- `d` is optional and must be an integer from 1 to 3650.
- Maximum decoded item name: 60 characters.
- Maximum decoded action label: 40 characters.
- Unknown fields are ignored.
- Unknown versions, malformed Base64URL, invalid IDs, and over-limit payloads are rejected.
- The fragment is not secret and must not contain passwords or sensitive information.

## 10. Data model

### `items`

```text
id
name
actionLabel
intervalDays | null
memo
createdAt
updatedAt
```

### `events`

```text
id
itemId
performedAt
note
source
createdAt
```

When an item is first imported through in-app Web NFC scanning, a later manual record from that opened item may use `source: "web-nfc"`.

The NFC hardware serial number is not persisted or used as an identity.

## 11. Persistence and privacy

- Items/events remain in IndexedDB.
- Language preference may use localStorage.
- NFC read/write operations happen through the local device NFC API.
- No tag payload or log history is sent to a server.
- No runtime CDN, API, analytics, telemetry, remote font, or tracking request.
- Keep the template CSP with `connect-src 'none'`.

“Fully local processing” remains accurate for user records: Web NFC is a local device API, not a network upload.

## 12. UX

- Mobile-first from 320 px upward.
- Home exposes a reader action only when Web NFC is actually available.
- The empty state can also scan an existing NFC Tap Log tag, allowing import before local items exist.
- Item detail exposes a separate verification action.
- The scan dialog tells the user to hold the phone close to the tag.
- Cancel remains available while scanning.
- Valid general scans show the item name/action before opening it.
- Verification success is explicit.
- Mismatch is a warning, not a destructive error.
- Unsupported tags are left untouched.
- Raw exception detail remains collapsed.
- No emoji UI icons; use SVG.

## 13. Browser target

Core logging continues to target current Chromium, Firefox, and Safari where IndexedDB is available.

Direct NFC reading/writing targets environments that expose Web NFC, principally supported Android Chromium browsers in a secure top-level context. `file://` remains useful for all non-NFC features but intentionally cannot scan/write tags.

## 14. Security

Portable tag input remains untrusted.

- Render tag/user strings as text, never HTML.
- Validate URL-fragment payloads before persistence.
- Never auto-navigate to arbitrary URLs from NFC content.
- Never create a log event merely because an NFC tag was scanned/opened.
- Do not use NFC hardware serial numbers as application identity.
- Do not expose a generic free-form NDEF reader/writer.
- Direct NFC writing still writes only the app-generated Portable Tag URL for the currently open item.

## 15. QR fallback

The QR code is a second physical entry point to the same Portable Tag URL:

```text
NFC URL ─┐
          ├─> same tag URL -> item screen -> explicit record action
QR code ─┘
```

The QR preview is generated locally. Saving creates a PNG on the device. Printing uses a print-only label layout with the item name, action label, and QR code. QR generation does not create a log event.

The QR code is not a secret. Anyone who can see/scan it can obtain the embedded tag URL and its portable display fields.

## 16. In-app help

Help must explain:

- How to create a tag entry and record work.
- Opening/scanning a tag does not create a log automatically.
- Supported Android browsers can read and write NFC tags from the HTTPS version.
- iPhone Safari and unsupported browsers can still open a prepared URL tag through the OS; direct in-page Web NFC is not provided there.
- Local HTML cannot perform direct NFC reading/writing.
- Existing NDEF content is overwritten when a write is confirmed.
- Verification detects an old/different tag after item details change.
- Records remain in this browser and may disappear if site data is removed.

## 17. Backup / restore contract

JSON backup shape:

```json
{
  "formatVersion": 1,
  "app": { "slug": "nfc-tap-log", "version": "1.0.0" },
  "exportedAt": "ISO-8601 timestamp",
  "items": [],
  "events": []
}
```

Restore validation is fail-closed. A file is rejected before database writes when it has the wrong app slug/version format, malformed item/event data, duplicate IDs, or an event whose `itemId` is absent from the backup item set.

Merge mode preserves existing browser-local objects for colliding stable IDs and only adds new item/event IDs. Replace mode clears both object stores and writes only the validated backup, after a second confirmation.

CSV export is intentionally not a restore format. It is a flat history export with item context for spreadsheet/report use.

All file parsing, export generation, validation, and IndexedDB writes happen locally in the browser.

## 18. Build acceptance

- Update `app.config.json`, `APP_SPEC.md`, `README.md`, `README.ja.md`, `CHANGELOG.md`.
- Include `assets/screenshot.png` and `assets/screenshot-en.png` from the final UI.
- Keep `assets/favicon.svg` as the canonical favicon/header icon with visible “NFC” text.
- Bundle the QR generation engine into the HTML source; it must not be loaded from a runtime CDN.
- Document the bundled QRCode for JavaScript/qrcode-terminal vendor code in `THIRD_PARTY_NOTICES.md`.
- Keep required template/standalone markers.
- `scripts/check-repository.ps1` should pass on the target Windows environment.
- Both standalone artifacts build and verify.
- Generated HTML has no unresolved placeholders or runtime external resources.
- Static checks must confirm the reader uses `NDEFReader.scan({ signal })`, handles `reading` and `readingerror`, never navigates arbitrary scanned URLs, compares all Portable Tag fields during verification, and generates QR codes from the same `buildTagUrl()` value used by NFC.
