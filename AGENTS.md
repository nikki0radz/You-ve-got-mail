# Project rules

- Keep every task simple, playful, and sequential. A send, edit, connection or settings process is a series of focused pop-ups, one decision per step. Never replace it with a large multi-option editing page.
- Show progress and provide Back, Next and Cancel. Preserve input when moving backwards; confirm before discarding unsaved content.
- Visual baseline: Muted Lagoon (colour option 10), Bubble Post layout, pigeon mascot 5, Your people option 8 (Status Stripe), a small subtle Annoy someone button, and labelled navigation icons.
- Keep the cheeky bothering-your-friends tone. Affectionate messages are one content option, not the overall identity.
- Retain accessible light/dark switches, deeply coloured dark mode, readable Open to mail controls, and explicit green/red status labels.
- Keep loud ringing off by default and independently consented per friend. Respect the receiving switch.
- Never present a simulated local receipt, account, connection, permission or test link as real remote functionality.
- Include Send test in development. A real single-use Send me something link must be enforced atomically by the server, not browser storage.
- Android overlay/background/lock-screen/DND behavior requires native implementation and physical-device testing. A browser draft must not pretend to grant Android permissions.
- Preserve unrelated changes and existing deployment settings. Run relevant checks before pushing.

- On light surfaces, explicitly pair body, helper and placeholder text with a dark ink. Check rendered normal text contrast of at least 4.5:1 in each supported theme.

- The pigeon is the postal courier mascot. Other illustrations can feature people, axolotls, bees, objects or any character that fits. Use the existing sticker art as the style reference for consistent rounded plum outlines, soft pastel colours, gentle shading and readable lettering. Avoid halo and yellow expression marks. Design love-note and reminder lettering into the objects themselves.

- Before releasing any shared CSS or guest welcome changes, run scripts/check-invitation.cjs against the release candidate at 320px and 430px. Keep the approved reference images separate from candidate renders. Update a reference only when the user approves that screen. Verify cross-app glass on a real phone over another app separately from browser or in-app previews.

- For design reviews, use the workroom board and the actual interactive screen at the paired phone size. Implement feedback from the exported review against the identified screen and working layout. Preserve unrelated screens and return a refreshed review link.
- When Nicole requests alternatives, put the requested number in a versioned round in design/rounds.mjs. If no count is specified, default to six (within five to ten). Place numbered controls outside the primary phone beside the element they change. Track that element as the preview scrolls or zooms. Use a fresh round ID for new alternatives so past exports can identify the chosen option.

- For multiple review targets, use plain numbers beside each element. Keep the target name accessible and preserve group IDs and independent choices in exports.
