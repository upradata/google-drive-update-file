#!/usr/bin/env bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
# "/Users/jamnickam/Thomas/GoogleDriveUploadFile"

/usr/local/bin/node "$SCRIPT_DIR"/build-esm/index.mjs  "$@"
