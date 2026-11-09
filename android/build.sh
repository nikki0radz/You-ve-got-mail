#!/usr/bin/env bash
# Resolve and merge the real Firebase/AndroidX runtime before signing the APK.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
: "${MAIL_KEYSTORE:?Set MAIL_KEYSTORE to the private signing keystore}"
: "${MAIL_PASSWORD_FILE:?Set MAIL_PASSWORD_FILE to its password file}"
tools_dir="$ANDROID_HOME/build-tools/${BUILD_TOOLS_VERSION:-35.0.0}"
output=${1:-"$root/dist-android/Youve-Got-Mail.apk"}
mkdir -p "$(dirname "$output")"
output=$(realpath -m "$output")
cd "$root/android"
./gradlew --no-daemon --console=plain assembleRelease
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
unsigned_apk=$(python3 -c 'import json;print("build/outputs/apk/release/"+json.load(open("build/outputs/apk/release/output-metadata.json"))["elements"][0]["outputFile"])')
python3 "$root/scripts/pack-apk.py" "$unsigned_apk" "$work/compressed.apk"
"$tools_dir/zipalign" -f -P 16 4 "$work/compressed.apk" "$work/aligned.apk"
"$tools_dir/apksigner" sign --ks "$MAIL_KEYSTORE" --ks-key-alias pigeonpost \
    --ks-pass "file:$MAIL_PASSWORD_FILE" --v4-signing-enabled false \
    --out "$work/signed.apk" "$work/aligned.apk"
"$tools_dir/apksigner" verify --verbose --print-certs "$work/signed.apk"
"$tools_dir/zipalign" -c -P 16 4 "$work/signed.apk"
ANDROID_HOME="$ANDROID_HOME" python3 "$root/scripts/check-android-push.py" "$work/signed.apk"
cp "$work/signed.apk" "$output"
echo "Signed APK: $output"
