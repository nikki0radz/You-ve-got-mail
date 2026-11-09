# You've Got Mail

A pigeon delivers transparent PNGs. The Android test edition receives real parcels from one-use invitations. The [web preview](https://nikki0radz.github.io/You-ve-got-mail/) also supports local design tests.

[Open the screen board](https://pigeon-post-delivery.nikki0radz.chatgpt.site/workroom/design/board.html) to open any page or picker. Options appear above the full phone. Choose one, edit and comment, then **Export for chat** and attach the JSON for the next revision.

## [Open Design Mode](https://pigeon-post-delivery.nikki0radz.chatgpt.site/workroom/design/index.html?page=home)

[GitHub Pages workspace](https://nikki0radz.github.io/You-ve-got-mail/design/index.html) · Each host keeps its own laptop-only drafts. For an existing paired postcard workspace, enter its private key under **Pair phone**.

On a laptop, use the page picker to open the home screen, mailbox, profile, settings, reply screens and guest delivery flow. The inspector scrolls independently. Click a control to see its rendered size, apply a button or layout preset, or copy a button style and paste it onto a different control. Additional page drafts save in this browser and can be exported for chat. Android 0.1.9 refreshes the postcard composer using the visual properties supported by that version.

Open the postcard composer on a laptop. **Edit elements** selects controls and **Try screen** uses the real composer. Select **Composer toolbar**, set its gap and choose **Save draft**. The reference phone uses example dimensions until paired.

Install [Android 0.1.9](https://pigeon-post-delivery.nikki0radz.chatgpt.site/downloads/Youve-Got-Mail-0.1.9.apk). Choose **Pair phone** on the laptop, then open **Settings → Design Mode** on Android and enter the private workspace key. **Refresh draft** shows the saved revision in the app. On the laptop, **Pair phone → Refresh phone measurements** loads the usable viewport, system insets and text scale. The narrow comparison uses the same text scale. Browser rendering can differ from the Android WebView.

Right-click a control or box in either laptop preview to comment on it or its surrounding group. **Export comments** downloads feedback with page, preview, option and element references. In Comments, choose this view or all reviewed pages and options in the current browser. **Export full design** downloads the current layout and its comments as one JSON file you can attach in chat, including unsaved edits.

Drafts contain versioned visual settings. Photos and typed test messages stay in each preview. Duplicating creates a separate draft. Restoring a revision brings its settings into the editor, and saving appends a revision. Approval records a choice for later publication. The main composer keeps its released design until a separate release.

## Review the live screen

In Android 0.1.18, the [web app](https://nikki0radz.github.io/You-ve-got-mail/), and the [guest preview](https://nikki0radz.github.io/You-ve-got-mail/guest.html?preview=1), turn on **Design mode** at the top. Tap an element, or pick a surrounding container under **Selected element**. Comments and colour changes save as you edit. **Done** lets you pick another element. Turn the switch off to continue through the app.

**Export design** creates a JSON file with the reviewed screens, their measured layouts, element comments and colour choices. Android opens its file picker. Export the Android app and the guest browser separately when reviewing both.

## Try it on Android

1. Install the signed APK on Android 9 or later. Android 0.1.41 opens **Set up your deliveries** on its first launch (and once after updating an older installation). The guide checks notifications, display over other apps and precise schedules, then offers optional background battery access. Each step opens the real Android permission screen and checks the current status when you return. Back, Skip for now and Later keep granting access optional. A final check lists anything still off. Repeat it from **Settings → Phone & appearance → Delivery setup**. Camera access is requested only when the camera is used; selecting photos needs no permission to the whole gallery.
2. Tap **Send test** and switch apps. The local test starts five seconds later. With warnings on, the incoming notification offers **Reject** for your selected 3, 10 or 15 seconds before the artwork appears. Dismiss and Reply appear on the overlay after one second.
3. Under **Settings → Send me something**, create a link and share it with a friend. They open it in their browser, choose a frame or sticker, fit a photo, position it on the portrait preview, and optionally add a note or sticker. They can send immediately or pick a time within 30 days. Their receipt page can check for your reply.
4. In **Inbox**, open received mail, send a sticker or text reply, or cancel a scheduled local parcel. Use **Sent** to check friend deliveries and replies. Under **Your people → Friends**, exchange codes and accept requests. Pick a design on the home wheel to send it to yourself or an accepted friend, now or later.

Sharing an invitation automatically starts a temporary live listening session. Android also checks periodically and on app resume; there is no manual listening control in Settings. Push notification setup remains incomplete in this Android build. Scheduled parcels already downloaded to the phone use native alarms. Exact timing requires alarm access. Android may defer background checks or restrict overlays on protected screens. In Phone & appearance, choose Blur or Black and set the black backdrop opacity (25% by default). Android uses this same black backdrop when cross-window blur is unavailable. In **Notification settings**, choose full pop-ups or notifications while open, and inbox-only or completely closed while closed. With full pop-ups enabled, pending deliveries can open one second after unlock. Friend-status notifications are opt-in.

All 30 reminder templates start with the original illustrated wording. Tap the reminder to replace that wording directly, or add a separate note. The guest link offers the four selected reminders. Transparent studio exports start at 1440 × 2688; photo-heavy parcels may reduce colour precision or dimensions to fit the service limit.

The in-app camera has a labelled flash switch for each lens, off by default. Android 0.1.42 uses a warm ivory selfie flash at the app window’s maximum brightness for about 1.1 seconds. It restores the prior window brightness after capture, on camera cancellation, on pause or destruction, and after a safety timeout. This uses no additional Android permission. Back flash briefly enables the camera light when the device exposes torch control; unsupported camera views show N/A and still take photos with flash off. The rear LED colour is controlled by the phone.

**Settings → Phone & appearance → Natural beauty filter** defaults on and remembers an explicit off choice. It uses local face landmarks for subtle smoothing that excludes the eyes and lips, and slightly reduces a yellow cast only within the open mouth. It preserves the captured photo’s resolution and processes frames in a dedicated worker. The model loads only when the camera is used with the filter enabled; preview work uses smaller frames. If graphics or model loading is unavailable, the camera explicitly shows that the original photo is being used. Tracking, exposure and maximum physical screen brightness still need testing on the target phone.

The pinned MediaPipe runtime and model are downloaded by `scripts/prepare-beauty-assets.mjs` on the first clean build and included in the app and published design release. Generated vendor binaries stay out of Git; the downloader checks the model checksum and includes the upstream licence.

## Guest delivery

The Android app creates a private mailbox key on the device. The HTTPS delivery service stores hashed credentials, claims a link atomically, and clears the parcel from the server after the receiver saves and acknowledges it. Invitations expire after seven days. The invitation and reply receipt travel in URL fragments on the guest page. Anyone holding an unspent invitation can use it once. Friend mail uses mutually accepted connections. The app stores received history on the device and saves a private receipt for each sent friend parcel.

## Development

Android 0.1.35 checks for published screen updates when opened or resumed. Compatible HTML, styles, scripts and built-in artwork download automatically, with a checksum for every file. The app keeps a complete offline copy and applies a new design only when no editor, picker or design review is open. Interrupted downloads keep the current release, and an updated screen that fails to start falls back to the previous working design. Installing 0.1.35 enables this; later compatible screen changes need no new APK. Native features and permission changes still require an installer.

`npm run build` generates `dist/design-update.json` from the exact web output. Publish the complete output at the existing Delivery workroom, including that manifest. Its bridge version must match the app's supported native interface. Never edit a published manifest without publishing its matching files.

Run `npm test`, `npm run check`, and `npm run build`. Serve the repository root or built dist folder with a static HTTP server. The PNG sprite sheets, alpha masks and template writing areas are in `assets/post`. The site uses GitHub Pages.

For Android, use JDK 17, SDK platform 35, Build Tools 35.0.0, zip, and Node.js. Set `ANDROID_HOME`, `MAIL_KEYSTORE` and `MAIL_PASSWORD_FILE`, then run `android/build.sh /path/to/Youve-Got-Mail.apk`. The builder bundles the same local editor, compiles the native delivery components, signs the APK with the private pigeonpost key and verifies its signature. Keep signing files outside the repository.

See [AGENTS.md](AGENTS.md) for design and interaction rules.
