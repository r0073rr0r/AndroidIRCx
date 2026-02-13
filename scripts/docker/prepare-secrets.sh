#!/bin/sh
set -eu

ROOT_DIR="/app"
SECRETS_DIR="$ROOT_DIR/secrets"

mkdir -p "$SECRETS_DIR"

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  printf "%s" "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$SECRETS_DIR/my-upload-key.keystore"
fi

if [ -n "${ANDROID_KEYSTORE_PASSWORD:-}${ANDROID_KEY_ALIAS:-}${ANDROID_KEY_PASSWORD:-}" ]; then
  cat > "$SECRETS_DIR/gradle.properties" <<EOF
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_STORE_PASSWORD=${ANDROID_KEYSTORE_PASSWORD:-}
MYAPP_UPLOAD_KEY_ALIAS=${ANDROID_KEY_ALIAS:-}
MYAPP_UPLOAD_KEY_PASSWORD=${ANDROID_KEY_PASSWORD:-}
EOF
fi

if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  printf "%s" "$GOOGLE_SERVICES_JSON" > "$SECRETS_DIR/google-services.json"
fi

if [ -n "${PLAY_SERVICE_ACCOUNT_JSON:-}" ]; then
  printf "%s" "$PLAY_SERVICE_ACCOUNT_JSON" > "$SECRETS_DIR/play-service-account.json"
fi

if [ -n "${TRANSIFEX_TOKEN:-}${TRANSIFEX_SECRET:-}${TRANSIFEX_NATIVE_TOKEN:-}${TRANSIFEX_CDS_HOST:-}${TRANSIFEX_API_TOKEN:-}" ]; then
  cat > "$SECRETS_DIR/transifex.env" <<EOF
TRANSIFEX_TOKEN=${TRANSIFEX_TOKEN:-${TRANSIFEX_API_TOKEN:-}}
TRANSIFEX_SECRET=${TRANSIFEX_SECRET:-}
TRANSIFEX_NATIVE_TOKEN=${TRANSIFEX_NATIVE_TOKEN:-}
TRANSIFEX_CDS_HOST=${TRANSIFEX_CDS_HOST:-https://cds.svc.transifex.net}
EOF
fi

cd "$ROOT_DIR/android"
chmod +x gradlew
exec "$@"
