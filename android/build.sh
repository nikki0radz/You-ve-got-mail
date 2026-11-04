#!/usr/bin/env bash
# Build the installable app using stock Android SDK tools and JDK 17.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
: "${MAIL_KEYSTORE:?Set MAIL_KEYSTORE to the private signing keystore}"
: "${MAIL_PASSWORD_FILE:?Set MAIL_PASSWORD_FILE to its password file}"
tools_dir="$ANDROID_HOME/build-tools/${BUILD_TOOLS_VERSION:-35.0.0}"
platform="$ANDROID_HOME/platforms/android-${COMPILE_SDK:-35}/android.jar"
output=${1:-"$root/dist-android/Youve-Got-Mail.apk"}
mkdir -p "$(dirname "$output")"
output=$(realpath -m "$output")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/assets/site" "$work/classes" "$work/dex"
cd "$root"
npm run build
cp -R dist/. "$work/assets/site/"
resources=()
if [[ -d android/res ]]; then
    "$tools_dir/aapt2" compile --dir android/res -o "$work/resources.zip"
    resources+=("$work/resources.zip")
fi
"$tools_dir/aapt2" link -I "$platform" --manifest android/AndroidManifest.xml \
    -A "$work/assets" --java "$work/generated" -o "$work/base.apk" "${resources[@]}"
find android/src "$work/generated" -type f -name '*.java' > "$work/sources"
java -m jdk.compiler/com.sun.tools.javac.Main -encoding UTF-8 -source 8 -target 8 \
    -bootclasspath "$tools_dir/core-lambda-stubs.jar:$platform" -d "$work/classes" @"$work/sources"
(cd "$work/classes" && zip -qr "$work/classes.jar" .)
min_sdk=$("$tools_dir/aapt" dump badging "$work/base.apk" | sed -n "s/^sdkVersion:'\([0-9]*\)'/\1/p")
"$tools_dir/d8" --min-api "${min_sdk:?Set an explicit minSdkVersion in the manifest}" \
    --lib "$platform" --output "$work/dex" "$work/classes.jar"
(cd "$work/dex" && zip -q "$work/base.apk" classes*.dex)
"$tools_dir/zipalign" -f -p 4 "$work/base.apk" "$work/aligned.apk"
"$tools_dir/apksigner" sign --ks "$MAIL_KEYSTORE" --ks-key-alias pigeonpost \
    --ks-pass "file:$MAIL_PASSWORD_FILE" \
    --v4-signing-enabled false --out "$work/signed.apk" "$work/aligned.apk"
"$tools_dir/apksigner" verify --verbose --print-certs "$work/signed.apk"
"$tools_dir/zipalign" -c -p 4 "$work/signed.apk"
cp "$work/signed.apk" "$output"
echo "Signed APK: $output"
