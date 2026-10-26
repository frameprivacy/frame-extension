#!/bin/sh
# Wraps the Safari build in an Xcode project (macOS and iOS app + extension).
# macOS only: needs Xcode 14.3 or later and its command line tools.
# Output: safari-xcode/Frame/ (ignored by git). See docs/safari.md for the rest.
set -eu

APP_NAME="Frame"
APP_BUNDLE_ID="com.frameprivacy.safari"
PROJECT_DIR="safari-xcode"
BUILD_DIR=".output/safari-mv3"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "safari:xcode runs on macOS only. Run 'npm run build:safari' here and finish on a Mac (docs/safari.md)." >&2
  exit 1
fi
if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun not found. Install Xcode, then run: xcode-select --install" >&2
  exit 1
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  npm run build:safari
fi
if [ ! -f "$BUILD_DIR/manifest.json" ]; then
  echo "No Safari build at $BUILD_DIR. Run 'npm run build:safari' first." >&2
  exit 1
fi

# Xcode 15+ ships safari-web-extension-packager; older Xcode calls it safari-web-extension-converter.
if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  TOOL="safari-web-extension-packager"
else
  TOOL="safari-web-extension-converter"
fi

# The project references $BUILD_DIR rather than copying it, so after the first run
# 'npm run build:safari' plus a rebuild in Xcode picks up changes, and your signing
# settings survive. FORCE=1 regenerates the project from scratch (signing is lost).
if [ -d "$PROJECT_DIR/$APP_NAME" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "$PROJECT_DIR/$APP_NAME already exists. Rebuild in Xcode, or run with FORCE=1 to regenerate it." >&2
  exit 0
fi

echo "Packaging $BUILD_DIR with $TOOL into $PROJECT_DIR/ ..."
xcrun "$TOOL" "$BUILD_DIR" \
  --project-location "$PROJECT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$APP_BUNDLE_ID" \
  --swift \
  --no-open \
  --no-prompt \
  --force

echo
echo "Done. Next (docs/safari.md):"
echo "  1. open \"$PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj\""
echo "  2. Set your Team on all four targets (macOS and iOS app + extension)."
echo "  3. Set both extension targets' bundle id to $APP_BUNDLE_ID.extension."
echo "  4. Build, run, and turn Frame on in Safari's Extensions settings."
