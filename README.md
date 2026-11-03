# You've Got Mail

A tiny pigeon. A minor inconvenience. A playful first draft of an opt-in friend messaging app.

## This draft

- Muted Lagoon light/dark palettes, pigeon 5 and the Status Stripe friend layout (Your people option 8).
- Small, subtle **Annoy someone** button and labelled navigation icons.
- Guided pop-ups: recipient → content type → message/picture/gift → frame → colour → optional scheduling → preview.
- Saved theme, receiving state, local profile, per-friend loud-ring preferences and message defaults.
- Send test, local inbox, replies, swipe/dismiss and five-minute snooze.
- Frame and colour editing happens one step at a time. Back preserves inputs; Cancel confirms before abandoning a multi-step edit.

This is a browser prototype. Owen and Sophie are demo friends. All receipts, replies and scheduled tests stay on this device. The UI labels this explicitly. Accounts, remote delivery, friend-code linking, globally single-use test links and native Android permissions are not implemented. The browser cannot display pop-ups over other apps or override silent/DND.

Scheduled tests and snoozes are checked while the page is open and catch up when reopened. They are not background push notifications. Images are limited to 2 MB and saved only in browser storage; storage errors are shown rather than reported as successful receipts.

## Run and deploy

No installation or dependencies required. Serve the repository root with any static HTTP server, or run `npm run build` and serve `dist/`.

```sh
npm test
npm run check
npm run build
```

The root `index.html` works with GitHub Pages from the main branch/root. For Cloudflare Pages, use build command `npm run build` and output directory `dist`. No worker, database or secrets are needed for this UI draft. Existing hosting settings should be retained.

## Next implementation stage

Use an authenticated server for accounts, accepted friend invitations, per-friend grants, message queues, acknowledgements and atomic single-use test-link redemption. Cloudflare Workers with D1 can store these records, with R2 for private image uploads. Never infer delivery from server acceptance; a receiver must acknowledge it. Scheduled sends must run on the server.

An Android wrapper/native service and push transport are needed for background receiving, overlays, unlock handling, notification controls and explicit per-friend loud ringing. Delivery while powered off cannot be immediate. These behaviors require current platform review and physical-device testing before they are promised.

## Design and interaction rules

See [AGENTS.md](AGENTS.md). All new processes must remain a simple sequence of game-style pop-ups, with one decision per step.
