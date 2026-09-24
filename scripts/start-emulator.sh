#!/usr/bin/env bash
# Boot the Android emulator used by the E2E suite and block until it is usable.
set -euo pipefail

AVD_NAME="${AVD_NAME:-Pixel_7_API_35}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"

if [ ! -x "$ADB" ]; then
  echo "adb not found at $ADB - set ANDROID_HOME to your SDK location." >&2
  exit 1
fi

if "$ADB" devices | grep -q "emulator-.*device$"; then
  echo "An emulator is already running - reusing it."
else
  echo "Starting AVD '$AVD_NAME'..."
  "$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" \
    -no-snapshot -no-boot-anim -gpu auto -netdelay none -netspeed full &
fi

"$ADB" wait-for-device
echo -n "Waiting for boot to complete"
until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
  echo -n "."
  sleep 2
done
echo " done."

"$ADB" shell settings put global window_animation_scale 0
"$ADB" shell settings put global transition_animation_scale 0
"$ADB" shell settings put global animator_duration_scale 0
echo "Emulator ready: $("$ADB" devices | sed -n '2p')"
