# You've Got Mail

A pigeon delivers transparent PNGs. The Android test edition receives real parcels from one-use invitations. The [web preview](https://nikki0radz.github.io/You-ve-got-mail/) also supports local design tests.

## Try it on Android

1. Install the signed APK on Android 9 or later. On first launch, open **Set up delivery**. Enable notifications and display over other apps. Enable precise schedules for timed tests.
2. Tap **Send test** and switch apps. The local test starts five seconds later. With warnings on, the incoming notification offers **Reject** for three seconds before the artwork appears. Dismiss and Reply appear on the overlay after one second.
3. Under **Settings → Send me something**, create a link and share it with a friend. They open it in their browser, choose a frame or sticker, fit a photo, position it on the portrait preview, and optionally add a note or second picture. They can send immediately or pick a time within 30 days. Their receipt page can check for your reply.
4. In **Inbox → Phone inbox & schedules**, open received mail, view rejected pop-ups, reply, or cancel a pending delivery. In Settings, enable **Scheduling** to add a timing step to local test parcels.

Sharing an invitation starts a 30-minute live listening session. After this, Android checks periodically and on app resume. Use **Phone permissions → Listen for mail for 30 minutes** to start another session. Scheduled parcels already downloaded to the phone use native alarms. Exact timing requires alarm access. Android may defer background checks or restrict overlays on protected screens. Devices without cross-window blur show transparent tint. Pausing pop-ups leaves optional notifications available.

## Guest delivery

The Android app creates a private mailbox key on the device. The HTTPS delivery service stores hashed credentials, claims a link atomically, and clears the parcel from the server after the receiver saves and acknowledges it. Invitations expire after seven days. The invitation and reply receipt travel in URL fragments on the guest page. Anyone holding an unspent invitation can use it once. Demo friend cards on the home screen still run local tests.

## Development

Run `npm test`, `npm run check`, and `npm run build`. Serve the repository root or built dist folder with a static HTTP server. The PNG sprite sheets, alpha masks and template writing areas are in `assets/post`. The site uses GitHub Pages.

For Android, use JDK 17, SDK platform 35, Build Tools 35.0.0, zip, and Node.js. Set `ANDROID_HOME`, `MAIL_KEYSTORE` and `MAIL_PASSWORD_FILE`, then run `android/build.sh /path/to/Youve-Got-Mail.apk`. The builder bundles the same local editor, compiles the native delivery components, signs the APK with the private pigeonpost key and verifies its signature. Keep signing files outside the repository.

See [AGENTS.md](AGENTS.md) for design and interaction rules.
