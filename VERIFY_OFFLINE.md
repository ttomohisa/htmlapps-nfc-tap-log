# Offline Verification

1. Run `build-standalone.bat`.
2. Open `dist/index.html` and `dist/index.self-extract.html` directly.
3. Open browser developer tools and clear the Network panel.
4. Enable offline mode or disconnect the device.
5. Reload the local HTML.
6. Exercise every core input, editing, preview, worker, and export flow.
7. Confirm there is no failed external resource request and no console error.
8. Change the suggested output filename, export, and confirm both the filename and file contents are correct.
9. If the app can replace its primary input while processing, change the input mid-process and confirm no stale result from the old input appears.
10. Confirm output files still open correctly.

For GitHub Pages, one initial request downloads the HTML. Clear the Network panel after the page has loaded, then test the complete app flow.


## Self-extracting variant

Open `dist/index.html` first and confirm that the browser favicon and upper-left application brand icon use the same artwork from `assets/favicon.svg`. Then open `dist/index.self-extract.html` directly, confirm that the loading screen text is readable, the same favicon as `dist/index.html` is visible, and the loading screen disappears. Repeat the same offline checks and verify that the browser console contains no decompression or CSP errors. `scripts/verify-self-extract.ps1` also enforces an ASCII-only loader and byte-for-byte restoration of the readable HTML.
## Optional WebRTC QR pairing component

The starter does not enable WebRTC by default. If the application copies `components/webrtc-qr-pairing.html`, verify the connection behavior separately in addition to the normal no-CDN/API checks:

1. Confirm `RTCPeerConnection` is created with `iceServers: []`.
2. Confirm no signaling server, STUN, TURN, WebSocket, fetch/XHR API, or runtime CDN was added.
3. Complete a host → joining device → host QR exchange on the same reachable LAN.
4. Confirm Offer/Answer QR data is not shown until ICE gathering reaches `complete`.
5. Deny camera permission and confirm the manual copy/paste signaling fallback remains usable.
6. Test connect → disconnect → reconnect repeatedly so stale PeerConnection/DataChannel events do not corrupt the next attempt.
7. Test a pre-connect joining-side ICE failure and confirm the Answer QR is regenerated with a fresh PeerConnection/session.
8. Force a network failure (for example, a guest network or client-isolation environment) and confirm diagnostics explain candidate/route state without exposing IP addresses.

`connect-src 'none'` remains expected. The direct WebRTC DataChannel is intentional peer-to-peer application traffic, not a hidden runtime dependency.


## Web NFC writer exception

The local `file://` standalone build is expected to keep all logging/history features working offline, but direct Web NFC writing is intentionally unavailable there. Test NFC writing separately on the published secure top-level page using a supported Android device:

1. Confirm the NFC write button appears only when Web NFC capability is available.
2. Confirm unsupported/iPhone/file environments retain URL copy and show a plain-language explanation.
3. Open the NFC write dialog and confirm it warns that existing NDEF content will be overwritten.
4. Start writing and cancel before presenting a tag; confirm the pending operation is aborted without an error state.
5. Write to a writable NDEF tag and confirm a success state.
6. Deny NFC permission and confirm a permission-focused error message.
7. Remove the tag during transfer or use an unwritable/too-small tag and confirm the UI gives a generic transfer/capacity/writability explanation rather than claiming an exact cause.
8. Confirm the CSP remains `connect-src 'none'` and no fetch/XHR/WebSocket/network dependency is introduced by the NFC flow.

## Backup / restore

1. Create at least two items, including one with no history, and add several history records with Japanese text and commas/quotes/newlines in notes.
2. Save History CSV and confirm UTF-8 Japanese text opens correctly and quoted CSV fields are not split.
3. Save JSON backup and confirm it contains `formatVersion`, app slug/version, `exportedAt`, all items, and all events.
4. Delete all local records, then restore the JSON in **Add** mode and confirm items/history return.
5. Restore the same JSON again in Add mode and confirm stable IDs prevent duplicate items/events.
6. Create/modify a local item, then Add the older backup and confirm the existing local object with the same ID is preserved.
7. Choose **Replace** mode and confirm a second destructive confirmation appears before current data is cleared.
8. Cancel that confirmation and confirm current data remains unchanged; then repeat and accept, confirming the backup becomes the complete database.
9. Try malformed JSON, a backup with another app slug, duplicate IDs, an orphan event, and over-limit text; confirm each is rejected before database changes.
10. Test with an empty database: export buttons that need data should be disabled while Restore remains available.
11. Confirm Delete all requires confirmation and removes items/history but keeps language/sort preferences.
12. Keep DevTools Network open throughout export/import and confirm no backup content is uploaded.

## v1.0.0 release UX checks

- Confirm PC and mobile layouts in Japanese and English.
- On a small viewport, confirm the fixed record action does not cover history/tag content and that toast/Undo appears above it.
- Confirm help, NFC read/write, edit, restore, and confirmation dialogs remain fully scrollable within the viewport.
- Test long item names, long action labels, and long memos for wrapping without horizontal scrolling.
- Confirm empty/loading/success/error states explain the next action.
- Confirm unsupported Web NFC hides non-working actions or explains the reason without blocking QR/URL/local logging.
- Confirm NFC permission rejection, NFC unavailable, read/write failure, cancellation, malformed tag, unrelated tag, and verification mismatch remain recoverable.
- Confirm CSV export, JSON backup, Add restore, Replace restore, invalid backup rejection, and delete-all confirmation.
- Confirm the Home privacy cards use general-user language while technical details remain available in repository documentation.
