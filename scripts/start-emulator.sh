#!/usr/bin/env bash
# Boot the Android emulator used by the E2E suite and block until it is usable.
set -euo pipefail

AVD_NAME="${AVD_NAME:-Pixel_7_API_35}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"

# Headless is dramatically faster for a test run: with the Qt window and GPU
# path disabled, `adb shell` round-trips drop from seconds to milliseconds.
# Set HEADLESS=0 when you want to watch the tests happen.
HEADLESS="${HEADLESS:-1}"

if [ ! -x "$ADB" ]; then
  echo "adb not found at $ADB - set ANDROID_HOME to your SDK location." >&2
  exit 1
fi

if "$ADB" devices | grep -q "emulator-.*device$"; then
  echo "An emulator is already running - reusing it."
else
  EMULATOR_ARGS=(-avd "$AVD_NAME" -no-snapshot -no-boot-anim -netdelay none -netspeed full)
  if [ "$HEADLESS" = "1" ]; then
    EMULATOR_ARGS+=(-no-window -no-audio -gpu swiftshader_indirect)
    echo "Starting AVD '$AVD_NAME' (headless)..."
  else
    EMULATOR_ARGS+=(-gpu auto)
    echo "Starting AVD '$AVD_NAME' (windowed)..."
  fi
  "$ANDROID_HOME/emulator/emulator" "${EMULATOR_ARGS[@]}" &
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
