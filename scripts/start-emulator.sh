#!/usr/bin/env bash
# Boot the Android emulator used by the E2E suite and block until it is usable.
#
#   npm run emulator              # headless (fast - use this for test runs)
#   HEADLESS=0 npm run emulator   # windowed, so you can watch the tests
#   RESTART=0 HEADLESS=0 ...      # never restart a running emulator, just report
set -euo pipefail

AVD_NAME="${AVD_NAME:-Pixel_7_API_35}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"

# Headless is dramatically faster for a test run: with the Qt window and GPU
# path disabled, `adb shell` round-trips drop from seconds to milliseconds.
# Set HEADLESS=0 when you want to watch the tests happen.
HEADLESS="${HEADLESS:-1}"
# When a running emulator is in the wrong window mode, restart it by default -
# otherwise HEADLESS would silently do nothing.
RESTART="${RESTART:-1}"

if [ ! -x "$ADB" ]; then
  echo "adb not found at $ADB - set ANDROID_HOME to your SDK location." >&2
  exit 1
fi

if [ "$HEADLESS" = "1" ]; then want_mode=headless; else want_mode=windowed; fi

# The emulator launcher execs a separate `-headless` qemu binary for -no-window,
# so the running process name tells us which mode we are looking at.
running_mode() {
  if pgrep -f "qemu-system-.*-headless" >/dev/null 2>&1; then
    echo headless
  else
    echo windowed
  fi
}

wait_for_shutdown() {
  local n=0
  while pgrep -f "qemu-system-aarch64" >/dev/null 2>&1 && [ "$n" -lt 30 ]; do
    n=$((n + 1)); sleep 2
  done
}

start_emulator() {
  local args=(-avd "$AVD_NAME" -no-snapshot -no-boot-anim -netdelay none -netspeed full)
  if [ "$HEADLESS" = "1" ]; then
    args+=(-no-window -no-audio -gpu swiftshader_indirect)
  else
    args+=(-gpu auto)
  fi
  echo "Starting AVD '$AVD_NAME' ($want_mode)..."
  "$ANDROID_HOME/emulator/emulator" "${args[@]}" &
}

if "$ADB" devices | grep -q "emulator-.*device$"; then
  have_mode="$(running_mode)"
  if [ "$have_mode" = "$want_mode" ]; then
    echo "An emulator is already running ($have_mode) - reusing it."
  elif [ "$RESTART" = "1" ]; then
    echo "An emulator is running in $have_mode mode but you asked for $want_mode - restarting it."
    "$ADB" emu kill >/dev/null 2>&1 || true
    wait_for_shutdown
    start_emulator
  else
    echo "An emulator is running in $have_mode mode but you asked for $want_mode." >&2
    echo "RESTART=0 is set, so it was left alone. Run 'adb emu kill' first, or drop RESTART=0." >&2
    exit 1
  fi
else
  start_emulator
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
echo "Emulator ready ($want_mode): $("$ADB" devices | sed -n '2p')"
