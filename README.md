# You've Got Mail

A tiny pigeon. A minor inconvenience. A playful first draft of an opt-in friend messaging app.

[Open the live app](https://nikki0radz.github.io/You-ve-got-mail/) and tap **Pick & post** to try the PNG collections. **Postcards → Milk carton** lets you add a photo and a message, then save or share the result.

## This draft

- Pale Forest / Forest Night home, illustrated receiving switch, swipeable pigeon portraits and availability badges.
- **Pick & post** on the home screen, alongside **Quick message** and labelled navigation icons.
- Guided pop-ups: recipient → content type → message/picture/gift → frame → colour → optional scheduling → preview.
- Saved theme, receiving state, local profile, per-friend loud-ring preferences and message defaults.
- Send test, local inbox, replies, swipe/dismiss and five-minute snooze.
- Frame and colour editing happens one step at a time. Back preserves inputs; Cancel confirms before abandoning a multi-step edit.

This is a browser prototype. The people shown on the home screen are demo friends. The Add a friend flow accepts OWEN-27 for a local round trip (lookup, outgoing request, invitation and response). My profile saves a Photo booth portrait, a choice of 30 pigeons or a custom photo, and the device’s existing friend code. All receipts, replies and scheduled tests stay on this device. The UI labels this explicitly. Accounts, remote delivery, friend-code linking, globally single-use test links and native Android permissions are not implemented. The browser cannot display pop-ups over other apps or override silent/DND.

Scheduled tests and snoozes are checked while the page is open and catch up when reopened. They are not background push notifications. Images are limited to 2 MB and saved only in browser storage; storage errors are shown rather than reported as successful receipts.

## Pick & post
Open **Pick & post** on the home screen. Choose a collection and a design, add a photo or message where the design calls for one, then choose an optional surround and extra note. **Save PNG** exports the finished artwork. **Share PNG** opens the system share sheet when supported and otherwise downloads a PNG. **Send test** uses the existing local recipient, scheduling and inbox flow. Photos are processed on the device.

The PNG sprite sheets, crop rectangles and template writing areas are in `assets/post`. Photo openings use matching alpha masks, including the shaped postcard formats.

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
